'use strict'

require('sugar')

var path = require('path'),
    async = require('async')


var Seed = function() {
  // constructor
  this._blueprints = {}
}

Seed.prototype.generate = function(type, overrideProperties, callback) {
   // properties is optional
  if (overrideProperties.length == 2 && typeof overrideProperties == 'function') {
    callback = overrideProperties
    overrideProperties = {}
  }
  if (!type) {
    return callback(new Error('No Type'))
  }
  var currentBlueprint = this.blueprint(type)

  if (!this.blueprint(type)){
    return callback(new Error('Invalid model in '+type+' blueprint: ' + modelType))
  }
  var modelType = this.blueprint(type)._model
  var Model
  if (modelType) {
    if (typeof modelType == 'string') {
       modelType = require('mongoose').models[modelType]
       if (!modelType) {
         return callback(new Error('Invalid string model in '+type+' blueprint: ' + modelType))
       }
    }
    Model = this.generator(modelType)
  }
  var key
  var self = this
  this.linkProperties(currentBlueprint, overrideProperties, function(err, props) {
    var properties = Object.clone(currentBlueprint)
    Object.each(props, function(key, value) {
      properties[key] = value
    })
    var keys = Object.keys(properties)
    async.forEach(
      keys,
      function(key, callback) {
        var property = properties[key]
        if (typeof property == 'function') {
          Seed.get(properties, key, callback)
        } else {
          callback()
        }
      },
      function(err) {
        if (err) throw err
        var meta = {}
        Object.each(properties, function(key, value) {
          if (key.startsWith('_') && key != '_id') {
            var keyWithNoUnderscore = key.remove(/[$_]/)
            meta[keyWithNoUnderscore] = properties[key]
            delete properties[key]
          }
        })
        if (Model) {
          var model = new Model(properties)
          callback.call(model, null, model, meta)
        } else {
          callback(null, properties, meta)
        }
      }
    )
  })
}

Seed.prototype.blueprint = function(type, definition) {
  if (definition) {
    this._blueprints[type] = definition
  }
  return this._blueprints[type]
}

Seed.evaluateProperty = function(context, property, count, callback) {
  var functions = []
  while(count--) {
    functions.push(property)
  }
  async.map(
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

Seed.prototype.evaluateProperty = function(property, count, callback) {
  Seed.evaluateProperty(this, property, count, callback)
}

Seed.prototype.linkProperties = function(blueprint, properties, callback) {
  var blueprintProperties = Object.keys(blueprint)
  var resultProperties = Object.clone(properties)
  var self = this
  async.reduce(
    blueprintProperties,
    resultProperties,
    function(memo, key, callback) {
      var item = blueprint[key]
      if (typeof item == 'function' && typeof memo[key] == 'number') {
        Seed.evaluateProperty(memo, item, memo[key], function(err, results) {
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

Seed.prototype.randomBetween = function(min, max) {
  if (max < min) return 0
  return Math.floor(Math.random() * (max - min + 1)) + min
}

Seed.generate = function() {
  throw new Error('Not implemented')
}

Seed.prototype.generator = function property(func) {
  func.isGenerator = true
  return func
}


Seed.get = function(object, property, callback) {
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

Seed.prototype.get = function(property, callback) {
  Seed.get(this, property, callback)
}

module.exports = Seed
