'use strict'

var path = require('path'),
    async = require('async'),
    _ = require('underscore')

var Kin = function() {
  // constructor
  this._blueprints = {}
}

Kin.prototype.generate = function(type, overrideProperties, callback) {
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
    var properties = _.clone(currentBlueprint)
    _.each(props, function(value, key) {
      properties[key] = value
    })
    var keys = _.keys(properties)
    async.forEach(
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
          callback.call(model, null, model, meta)
        } else {
          callback(null, properties, meta)
        }
      }
    )
  })
}

Kin.prototype.blueprint = function(type, definition) {
  if (definition) {
    this._blueprints[type] = definition
  }
  return this._blueprints[type]
}

Kin.evaluateProperty = function(context, property, count, callback) {
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

Kin.prototype.get = function(property, callback) {
  Kin.get(this, property, callback)
}

module.exports = Kin
