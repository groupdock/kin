'use strict'

var testCase = require('nodeunit').testCase,
    Step = require('step'),
    EventEmitter = require('events').EventEmitter,
    Seed = require('../lib/blueprints'),
    uuid = require('node-uuid'),
    ObjectId = require('mongoose').Types.ObjectId,
    Faker = require('faker')

var User,
    Stream,
    Activity,
    activities

var seed

var tests = testCase({
  setUp: function(callback) {
    Step(
      function() {
        h.dropCollections(this)
      },
      function() {
        seed = new Seed()
        // be aware, the function string
        // itself acts as the key to the blueprint
        User = function(properties) {
          // user
          this._id = uuid()
          Object.merge(this, Object.clone(properties))

        }
        Stream = function(properties) {
          // stream
          this._id = uuid()
          Object.merge(this, Object.clone(properties))
        }
        Activity = function(properties) {
          // activity
          this._id = uuid()
          Object.merge(this, Object.clone(properties))
        }
        callback()
      }
    )
  },
  'is sane': function(test) {
    test.ok(seed)
    test.ok(typeof seed.generate == 'function')
    test.ok(typeof seed.blueprint == 'function')
    test.done()
  },
  'should err if no type': function(test) {
    seed.generate('', function(err, model) {
      test.ok(err)
      test.done()
    })
  },
  'should err if invalid type': function(test) {
    seed.generate('ksjhdfb', function(err, model) {
      test.ok(err)
      test.done()
    })
  },
  'blueprint("name") should return that blueprint': function(test) {
    var userBlueprint = {
      _count: function(callback) {
        count++
        callback(null, count)
      },
      user: 'tim'
    }
    seed.blueprint('User', userBlueprint)
    test.deepEqual(userBlueprint, seed.blueprint('User'))
    test.done()
  },
  'should not return _ properties': function(test) {
    var count = 0
    seed.blueprint('User', {
      _count: function(callback) {
        count++
        callback(null, count)
      },
      user: 'tim'
    })

    seed.generate('User', function(err, model) {
      if (err) throw err
      test.ok(!err)
      test.equal('tim', model.user)
      test.equal(1, count)
      test.deepEqual({user: 'tim'}, model)
      test.done()
    })
  },
  'link': {
    'evaluateProperty count times':function(test) {
      Seed.evaluateProperty({},
        function(callback) {
          callback(null, 'item')
        }, 5,
        function(err, result) {
          test.equal(5, result.length)
          test.ok(result.every('item'))
          test.done()
        }
      )
    },
    'evaluateProperty count times with a context':function(test) {
      Seed.evaluateProperty({prop: 'hello'},
        function(callback) {
          test.ok(this.prop == 'hello')
          callback(null, 'item')
        }, 5,
        function(err, result) {
          test.equal(5, result.length)
          test.ok(result.every('item'))
          test.done()
        })
    },
    'linkProperties count times':function(test) {
      seed.linkProperties({
        users: function(callback) {
          callback(null, 'item')
        }
      }, {
        users: 5,
      },
      function(err, result) {
        test.equal(5, result.users.length)
        test.ok(result.users.every('item'))
        test.done()
      })
    },
  },
  'can evaluate properties of object using get': {
    'seed.setgenerator sets isGenerator': function(test) {
      var obj = {}
      seed.generator(obj)
      test.ok(obj.isGenerator)
      test.done()
    },
    'should set value on passed in object': function(test) {
      var obj = {
        thing: function(callback) {
          callback(null, 'thang')
        }
      }
      Seed.get(obj, 'thing', function(err, value) {
        test.ok(!err)
        test.equal('thang', value)
        test.equal('thang', obj.thing)
        test.done()
      })
    },
    'should return function if isGenerator': function(test) {
      var obj = {
        thing: seed.generator(function(callback) {
          callback(null, 'thang')
        })
      }
      Seed.get(obj, 'thing', function(err, value) {
        test.ok(!err)
        test.ok(value.isGenerator)
        test.ok(typeof value == 'function')
        test.done()
      })
    },
    'should throw err if property doesn\'t exist': function(test) {
      var obj = {}
      Seed.get(obj, 'thing', function(err, value) {
        test.ok(err)
        test.strictEqual(undefined, obj.thing)
        test.done()
      })
    }
  },
  'generate': {
    'should generate models': function(test) {
      seed.blueprint('User', {
        _model: User,
        username: 'joe'
      })
      seed.generate('User', function(err, model) {
        if (err) throw err

        test.ok(model && model instanceof User)
        test.done()
      })
    },
    'should generate model with supplied properties': function(test) {
      seed.blueprint('User', {
        _model: User,
        username: 'joe'
      })

      seed.generate('User', {username: 'joe'}, function(err, model) {
        if (err) throw err

        test.equal('joe', model.username)
        test.done()
      })
    },
    'should generate based on object blueprint': {
      'single property': function(test) {
        seed.blueprint('User', {
          _model: User,
          username: 'joe'
        })
        seed.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe', model.username)
          test.done()
        })
      },
      'multiple properties': function(test) {
        seed.blueprint('User', {
          _model: User,
          username: 'joe',
          email: 'joe@example.com'
        })
        seed.generate('User', function(err, model) {
          if (err) throw err

          test.equal('joe', model.username)
          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
      'numeric properties': function(test) {
          seed.blueprint('User', {
            _model: User,
            _userNum: 3,
            email: function(callback) {
              callback(null, 'user'+this._userNum+'@example.com')
            }
          })
          seed.generate('User', {username: 'bill'}, function(err, model) {
            if (err) throw err
            test.equal('bill', model.username)
            test.equal('user3@example.com', model.email)
            test.done()
          })
        },
      'supplied properties should overwrite blueprint': {
        'single property': function(test) {
          seed.blueprint('User', {
            _model: User,
            username: 'joe'
          })
          seed.generate('User', {username: 'bill'}, function(err, model) {
            if (err) throw err

            test.equal('bill', model.username)
            test.done()
          })
        },
        'multiple properties': function(test) {
          seed.blueprint('User', {
            _model: User,
            username: 'joe',
            email: 'joe@example.com'
          })
          seed.generate('User', {username: 'bill', email: 'bill@example.com'}, function(err, model) {
            if (err) throw err

            test.equal('bill', model.username)
            test.equal('bill@example.com', model.email)
            test.done()
          })
        }, 

        'if blueprint properties don\'t exist': function(test) {
          seed.blueprint('User', {
            _model: User,
            username: 'joe',
          })
          seed.generate('User', {username: 'bill', email: 'bill@example.com'}, function(err, model) {
            if (err) throw err

            test.equal('bill', model.username)
            test.equal('bill@example.com', model.email)
            test.done()
          })
        },
        'if supplied properties don\'t exist': function(test) {
          seed.blueprint('User', {
            _model: User,
            username: 'joe',
            email: 'joe@example.com'
          })
          seed.generate('User', {username: 'bill'}, function(err, model) {
            if (err) throw err

            test.equal('bill', model.username)
            test.equal('joe@example.com', model.email)
            test.done()
          })
        }
      },
      'should generate based on object blueprint with function': function(test) {
        seed.blueprint('User', {
          _model: User,
          username: function(callback) {
            callback(null, 'joe')
          }
        })
        seed.generate('User', function(err, model) {
          if (err) throw err

          test.equal('joe', model.username)
          test.done()
        })
      },
      'test can reference other properties via `this` in blueprint function': function(test) {
        seed.blueprint('User', {
          _model: User,
          email: function(callback) {
            callback(null, this.username + '@example.com')
          },
          username: 'joe',
        })
        seed.generate('User', function(err, model) {
          if (err) throw err

          test.equal('joe@example.com', model.email)
          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
      'test can reference other function properties via `this` in blueprint function': function(test) {
        seed.blueprint('User', {
          _model: User,
          username: function(callback) {
            callback(null, 'joe')
          },
          email: function(callback) {
            callback(null, this.username + '@example.com')
          }
        })
        seed.generate('User', function(err, model) {
          if (err) throw err

          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
      'test can reference other properties via `this` in blueprint function when referencing out of order': function(test) {
        seed.blueprint('User', {
          _model: User,
          username: 'joe',
          email2: function(callback) {
            Seed.get(this, 'email', function(err, value) {
              callback(err, value + '@example.com')
            })
          },
          email: function(callback) {
            Seed.get(this, 'username', function(err, value) {
              callback(err, value + '@example.com')
            })
          },

        })
        seed.generate('User', function(err, model) {
          if (err) throw err

          test.equal('joe@example.com', model.email)
          test.equal('joe@example.com', model.email)
          test.equal('joe@example.com@example.com', model.email2)
          test.done()
        })
      },
      'test can reference other function properties via `this` in blueprint function when not in order': function(test) {
        seed.blueprint('User', {
          _model: User,
          username: function(callback) {
            callback(null, 'joe')
          },
          email: function(callback) {
            callback(null, this.username + '@example.com')
          }
        })
        seed.generate('User', function(err, model) {
          if (err) throw err

          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
    },
    'callback context is the generated object': function(test) {
      seed.blueprint('User', {
        _model: User,
        username: 'joe',
      })
      seed.generate(
        'User', 
        {
          email: function(callback) {
            test.equal('joe', this.username)
            callback(null, 'joe@example.com')
          }
        },
        function(err, user) {
          test.equal('joe', this.username)
          test.done()
        })
    },
    'generate can link properties': function(test) {
      seed.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          var stream = new Stream({
            title: 'stream ' + Faker.Company.catchPhrase()
          })
          callback(null, stream._id)
        })
      })
      seed.generate('User', function(err, user) {
        if (err) throw err

        test.equal('joe', user.username)
        test.ok(user.streams && typeof user.streams == 'string')
        test.done()
      })
    },
    'generate can link properties with count': function(test) {
      seed.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          var stream = new Stream({
            title: 'stream ' + Faker.Company.catchPhrase()
          })
          callback(null, stream)
        })
      })
      seed.generate('User', {streams: 3}, function(err, user) {
        if (err) throw err

        test.equal('joe', user.username)
        test.ok(user.streams)
        test.equal(3, user.streams.length)
        test.ok(user.streams.every(function(stream) {
          return stream instanceof Stream
        }))
        test.ok(user.streams.every(function(stream) {
          return stream.title.startsWith('stream')
        }))
        test.done()
      })
    },
    'generate can link properties with count and generated item': function(test) {
      seed.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      seed.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          seed.generate('Stream', function(err, stream) {
            callback(null, stream._id)
          })
        })
      })
      seed.generate('User', {streams: 6}, function(err, user) {
        if (err) throw err

        test.equal('joe', user.username)
        test.ok(user.streams)
        test.equal(6, user.streams.length)
        test.ok(user.streams.every(function(stream) {
          return typeof stream == 'string'
        }))
        test.done()
      })
    },
    'generate with linked properties can override properties': function(test) {
      seed.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      seed.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          seed.generate('Stream', function(err, stream) {
            callback(null, stream._id)
          })
        })
      })
      seed.generate('User', {username: 'bill', streams: 5}, function(err, user) {
        if (err) throw err

        test.equal('bill', user.username)
        test.ok(user.streams)
        test.equal(5, user.streams.length)
        test.ok(user.streams.every(function(stream) {
          return typeof stream == 'string'
        }))
        test.done()
      })
    },
    'generate _ properties doesn\'t actually create the property': function(test) {
      seed.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      var streams = []
      var count = 0
      seed.blueprint('User', {
        _model: User,
        _id : uuid(),
        username: 'joe',
        _streams: function(callback) {
          seed.generate('Stream', {title: count++, userId: this._id}, function(err, stream) {
            streams.push(stream)
            callback()
          })
        }
      }),
      seed.generate('User', {_streams: 5}, function(err, user) {
        test.equal('joe', user.username)
        test.ok(!user._streams)
        test.ok(!user.streams)
        test.equal(5, streams.length)
        test.ok(streams.every(function(stream) {
          return stream.userId == user._id
        }))
        test.done()
      })

    },
    'generate _ properties doesn\'t actually create the property, and can be referenced': function(test) {
      seed.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      var streams = []
      var count = 0
      var self = this
      seed.blueprint('User', {
        _model: User,
        _id : uuid(),
        username: 'joe',
        _someNumber: 4,
        _streams: function(callback) {
          seed.generate('Stream', {title: this._someNumber.toString(), userId: this._id}, function(err, stream) {
            streams.push(stream)
            callback()
          })
        }
      }),
      seed.generate('User', {_streams: 5}, function(err, user) {
        test.equal('joe', user.username)
        test.ok(!user._streams)
        test.ok(!user.streams)
        test.equal(5, streams.length)
        test.deepEqual(['4', '4', '4', '4', '4'], streams.map(function(stream) {
          return stream.title
        }))
        test.ok(streams.every(function(stream) {
          return stream.userId == user._id
        }))
        test.done()
      })
    },
    'generate _ properties doesn\'t actually create the property, but does return it on second non-err param of callback': function(test) {
      seed.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      var streams = []
      var count = 0
      var self = this
      seed.blueprint('User', {
        _model: User,
        _id : uuid(),
        username: 'joe',
        _someNumber: 4,
        _streams: function(callback) {
          seed.generate('Stream', {title: this._someNumber.toString(), userId: this._id}, function(err, stream) {
            streams.push(stream)
            callback(null, stream)
          })
        }
      }),
      seed.generate('User', {_streams: 5}, function(err, user, meta) {
        test.equal('joe', user.username)
        test.ok(meta.streams)
        test.equal(5, streams.length)
        test.deepEqual(meta.streams, streams)
        test.done()
      })
    },
    'handles simple nesting': function(test) {
      seed.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })

      seed.blueprint('User', {
        _model: User,
        _id: new ObjectId().toString(),
        username: Faker.Internet.userName(),
        email: function(callback) {
          callback(null, Faker.Internet.email())
        },
        streams: function(callback) {
          seed.generate('Stream', {_activities: 0}, function(err, stream) {
            callback(null, stream._id)
          })
        }
      })
      seed.generate('User', {streams: 3}, function(err, user) {
        test.equal(3, user.streams.length)
        test.done()
      })
    },
    'handles simple nesting with _ properties': function(test) {
      var titles = []
      seed.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        userId: null,
        _title: function(callback) {
          test.strictEqual(this.userId, null)
          titles.push(Faker.Company.catchPhrase())
          callback(null)
        }
      })

      seed.blueprint('User', {
        _model: User,
        _id: function(callback) {
          callback(null, new ObjectId().toString())
        },
        username: Faker.Internet.userName(),
        email: function(callback) {
          callback(null, Faker.Internet.email())
        },
        streams: function(callback) {
          var self = this
          seed.generate('Stream', {_title: 5}, function(err, stream) {
            Seed.get(self, '_id', function(err, id) {
              stream.userId = id
              callback(null, stream)
            })
          })
        }
      })
      seed.generate('User', {streams: 3}, function(err, user) {
        test.equal(3, user.streams.length)
        test.equal(5 * user.streams.length, titles.length)
        test.ok(user.streams.every(function(stream) {
          return stream.userId == user._id
        }))
        test.done()
      })
    },
    'handles 3 levels of nesting': function(test) {
      var activities = []
      var count = 0
      seed.blueprint('Stream', {
        _model: Stream,
        _id: function(callback) {
          callback(null, new ObjectId().toString())
        },
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        },
        _activities: function(callback) {
          seed.get('_id', function(err, id) {
            seed.generate('Activity', {streamId: id}, function(err, activity) {
              activities.push(activity)
              callback(err, activity)
            })
          })
        }
      })
      seed.blueprint('Activity', {
        _model: Activity,
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      seed.blueprint('User', {
        _model: User,
        _id: function(callback) {
          callback(null, new ObjectId().toString())
        },
        username: Faker.Internet.userName(),
        email: function(callback) {
          callback(null, Faker.Internet.email)
        },
        streams: function(callback) {
          seed.generate('Stream', {_activities: 7}, function(err, stream) {
            callback(null, stream._id)
          })
        }
      })
      seed.generate('User', {streams: 3}, function(err, user) {
        test.equal(3, user.streams.length)
        test.equal(user.streams.length * 7, activities.length)
        test.done()
      })
    },
    'can handle mongoose models': testCase({
      setUp: function(callback) {
        Activity = require('./fixtures').Activity
        User = require('./fixtures').User
        Stream = require('./fixtures').Stream
        activities = []
        callback()
      },
      'will handle nesting': function(test) {
        seed.blueprint('Stream', {
          _model: Stream,
          _id: function(callback) {
            callback(null, new ObjectId().toString())
          },
          title: function(callback) {
            callback(null, Faker.Company.catchPhrase())
          },
          _activities: function(callback) {
            seed.get('_id', function(err, id) {
              seed.generate('Activity', {streamId: id}, function(err, activity) {
                activities.push(activity)
                callback(err, activity)
              })
            })
          }
        })
        seed.blueprint('Activity', {
          _model: Activity,
          _id: function(callback) {
            callback(null, new ObjectId().toString())
          },
          title: function(callback) {
            callback(null, Faker.Company.catchPhrase())
          }
        })
        seed.blueprint('User', {
          _model: User,
          _id: function(callback) {
            callback(null, new ObjectId().toString())
          },
          username: Faker.Internet.userName(),
          email: function(callback) {
            callback(null, Faker.Internet.email())
          },
          streams: function(callback) {
            seed.generate('Stream', {_activities: 7}, function(err, stream) {
              callback(null, new ObjectId().toString())
            })
          }
        })
        seed.generate('User', {streams: 3}, function(err, user) {
          test.ok(!err)
          test.equal(3, user.streams.length)
          test.equal(user.streams.length * 7, activities.length)
          test.done()
        })
      },
      'should generate valid mongoose models when given string _model': function(test) {
        seed.blueprint('User', {
          _model: 'User',
          username: 'joe'
        })
        seed.generate('User', function(err, model) {
          if (err) throw err

          test.ok(model && model instanceof User)
          test.done()
        })
      }
    }),
  }
})

module.exports = tests
