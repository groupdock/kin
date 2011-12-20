'use strict'

var path = require('path'),
    async = require('async'),
    _ = require('underscore')

// if you want to use mongoose with kin, pass your mongoose instance in
var Kin = function(mongoose) {
  // constructor
  this.mongoose = mongoose
  this._blueprints = {}
  this._postFunctions = {}
}

function generate(type, overrideProperties, callback) {
  var currentBlueprint = this.blueprint(type)

  if (!this.blueprint(type)){
    return callback(new Error('Invalid model in '+type+' blueprint: ' + modelType))
  }
  var modelType = this.blueprint(type)._model
  var Model
  if (modelType) {
    if (typeof modelType == 'string') {
      // mongoose instance must be passed in
      modelType = this.mongoose && this.mongoose.models[modelType]
      if (!modelType) {
        return callback(new Error('Invalid string model in '+type+' blueprint: ' + this.blueprint(type)._model))
      }
    }
    Model = this.generator(modelType)
  }
  var key
  var self = this
  this.linkProperties(currentBlueprint, overrideProperties, function(err, props) {
    var properties = _.clone(currentBlueprint)
    _.each(props, function(value, key) {
      properties[key] = value
    })
    var keys = _.keys(properties)
    async.forEachSeries(
      keys,
      function(key, callback) {
        var property = properties[key]
        if (typeof property == 'function') {
          Kin.get(properties, key, callback)
        } else {
          callback()
        }
      },
      function(err) {
        if (err) throw err
        var meta = {}
        _.each(properties, function(value, key) {
          if (/^_/.test(key) && key != '_id') {
            var keyWithNoUnderscore = key.substr(1)
            meta[keyWithNoUnderscore] = properties[key]
            delete properties[key]
          }
        })
        if (Model) {
          var model = new Model(properties)
          return callback.call(model, null, model, meta)
        } else {
          return callback.call(properties, null, properties, meta)
        }
      }
    )
  })
}
Kin.prototype._getGeneratorFunction = function(type) {
  var self = this
  var generatorFunction = function(overrideProperties, callback) {
    if (arguments.length == 1 && typeof overrideProperties == 'function') {
      callback = overrideProperties
      overrideProperties = {}
    }
    generate.call(self, type, overrideProperties, function(err, model, meta) {
      if (self._postFunctions[type] && self._postFunctions[type].length > 0) {
        var functionList = _.clone(self._postFunctions[type])
        functionList.unshift(function(next) {
          next(err, model, meta)
        })
        async.waterfall(functionList, function(err, model, meta) {
          callback.call(model, err, model, meta)
        })
      } else {
        callback.call(model, err, model, meta)
      }
    })
  }
  var returnFunction = function(overrideProperties, callback) {
    if (arguments.length == 1 && typeof overrideProperties == 'function') {
      callback = overrideProperties
      overrideProperties = {}
    }
    generatorFunction(overrideProperties, function(err, model, meta) {
      var functionList = _.clone(returnFunction._postFunctions)
      functionList.unshift(function(next) {
        next(err, model, meta)
      })
      async.waterfall(functionList, function(err, model, meta) {
        callback.call(model, err, model, meta)
      })
    })
  }
  returnFunction._postFunctions = []
  returnFunction.post = function(func) {
    returnFunction._postFunctions.push(func)
  }
  return returnFunction
}

Kin.prototype.generate = function(type, overrideProperties, callback) {
  // TODO Clean this mess up.
  var self = this
  // properties is optional
  if (arguments.length >= 2) {
    if (arguments.length == 2 && typeof overrideProperties == 'function') {
      callback = overrideProperties
      overrideProperties = {}
    }
    if (!type) {
      if (callback) return callback(new Error('No Type'))
    }
    return this._getGeneratorFunction(type)(overrideProperties, callback)
  } else if (arguments.length == 1) {
    return this._getGeneratorFunction(type, overrideProperties)
  }
}

Kin.prototype.blueprint = function(type, definition) {
  if (definition) {
    this._blueprints[type] = definition
  }

  return this._blueprints[type]
}

Kin.prototype.post = function(type, func) {
  this._postFunctions[type] = this._postFunctions[type] || []
  this._postFunctions[type].push(func)
}

Kin.evaluateProperty = function(context, property, count, callback) {
  var functions = []
  while(count--) {
    functions.push(property)
  }
  async.mapSeries(
    functions,
    function(item, callback) {
      item.call(context, function(err, result) {
        callback(err, result)
      })
    },
    function(err, results) {
      if (err) throw err
      callback(err, results)
    }
  )
}

Kin.prototype.evaluateProperty = function(property, count, callback) {
  Kin.evaluateProperty(this, property, count, callback)
}

Kin.prototype.linkProperties = function(blueprint, properties, callback) {
  var blueprintProperties = _.keys(blueprint)
  var resultProperties = _.clone(properties)
  var self = this
  async.reduce(
    blueprintProperties,
    resultProperties,
    function(memo, key, callback) {
      var item = blueprint[key]
      if (typeof item == 'function' && typeof memo[key] == 'number') {
        Kin.evaluateProperty(memo, item, memo[key], function(err, results) {
          memo[key] = results
          callback(null, memo)
        })
      } else {
        memo[key] = blueprint[key]
        if (properties[key] != undefined) {
          memo[key] = properties[key]
        }
        callback(null, memo)
      }
    },
    function(err, results) {
      if (err) throw err
      callback(null, results) 
    }
  )
}

Kin.prototype.randomBetween = function(min, max) {
  if (max < min) return 0
  return Math.floor(Math.random() * (max - min + 1)) + min
}

Kin.generate = function() {
  throw new Error('Not implemented')
}

Kin.prototype.generator = function property(func) {
  func.isGenerator = true
  return func
}

Kin.get = function(object, property, callback) {
  var value = object[property]
  if (!value) return callback(new Error('Property not defined: ' + property))
  if (typeof value == "function" && !value.isGenerator) {
    value.call(object, function(err, gotValue) {
      object[property] = gotValue
      callback(err, gotValue)
    })
  } else {
    callback(null, value)
  }
}

module.exports = Kin
