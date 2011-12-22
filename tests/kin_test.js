'use strict'

var testCase = require('nodeunit').testCase,
    EventEmitter = require('events').EventEmitter,
    Kin = require('../lib/kin'),
    uuid = require('node-uuid'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId,
    Faker = require('Faker'),
    _ = require('underscore')

var User,
    Stream,
    Activity,
    activities

var kin

var tests = testCase({
  setUp: function(callback) {
    kin = new Kin(mongoose)
    // mock 'models'
    User = function(properties) {
      this._id = uuid()
      _.extend(this, _.clone(properties))
    }
    Stream = function(properties) {
      this._id = uuid()
      _.extend(this, _.clone(properties))
    }
    Activity = function(properties) {
      this._id = uuid()
      _.extend(this, _.clone(properties))
    }
    callback()
  },
  'is sane': function(test) {
    test.ok(kin)
    test.ok(typeof kin.generate == 'function')
    test.ok(typeof kin.blueprint == 'function')
    test.done()
  },
  'should err if no type': function(test) {
    kin.generate('', function(err, model) {
      test.ok(err)
      test.done()
    })
  },
  'should err if invalid type': function(test) {
    kin.generate('ksjhdfb', function(err, model) {
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
    kin.blueprint('User', userBlueprint)
    test.deepEqual(userBlueprint, kin.blueprint('User'))
    test.done()
  },
  'should not return _ properties': function(test) {
    var count = 0
    kin.blueprint('User', {
      _count: function(callback) {
        count++
        callback(null, count)
      },
      user: 'tim'
    })

    kin.generate('User', function(err, model) {
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
      Kin.evaluateProperty({},
        function(callback) {
          callback(null, 'item')
        }, 5,
        function(err, results) {
          if (err) throw err
          test.equal(5, results.length)
          test.ok(_.every(results, function(result) {
            return result == 'item'
          }))
          test.done()
        }
      )
    },
    'evaluateProperty count times with a context':function(test) {
      Kin.evaluateProperty({prop: 'hello'},
        function(callback) {
          test.ok(this.prop == 'hello')
          callback(null, 'item')
        }, 5,
        function(err, results) {
          if (err) throw err
          test.equal(5, results.length)
          test.ok(_.every(results, function(result) {
            return result == 'item'
          }))
          test.done()
        })
    },
    'linkProperties count times':function(test) {
      kin.linkProperties({
        users: function(callback) {
          callback(null, 'item')
        }
      }, {
        users: 5,
      },
      function(err, results) {
        if (err) throw err
        test.equal(5, results.users.length)
        test.ok(_.every(results.users, function(result) {
          return result == 'item'
        }))
        test.done()
      })
    },
  },
  'can evaluate properties of object using get': {
    'kin.setgenerator sets isGenerator': function(test) {
      var obj = {}
      kin.generator(obj)
      test.ok(obj.isGenerator)
      test.done()
    },
    'should set value on passed in object': function(test) {
      var obj = {
        thing: function(callback) {
          callback(null, 'thang')
        }
      }
      Kin.get(obj, 'thing', function(err, value) {
        test.ok(!err)
        test.equal('thang', value)
        test.equal('thang', obj.thing)
        test.done()
      })
    },
    'should return function if isGenerator': function(test) {
      var obj = {
        thing: kin.generator(function(callback) {
          callback(null, 'thang')
        })
      }
      Kin.get(obj, 'thing', function(err, value) {
        test.ok(!err)
        test.ok(value.isGenerator)
        test.ok(typeof value == 'function')
        test.done()
      })
    },
    'should throw err if property doesn\'t exist': function(test) {
      var obj = {}
      Kin.get(obj, 'thing', function(err, value) {
        test.ok(err)
        test.strictEqual(undefined, obj.thing)
        test.done()
      })
    }
  },
  'generate': {
    'should generate models': function(test) {
      kin.blueprint('User', {
        _model: User,
        username: 'joe'
      })
      kin.generate('User', function(err, model) {
        if (err) throw err
        test.ok(model && model instanceof User)
        test.done()
      })
    },
    'should generate model with supplied properties': function(test) {
      kin.blueprint('User', {
        _model: User,
        username: 'joe'
      })
      kin.generate('User', {username: 'joe'}, function(err, model) {
        if (err) throw err
        test.equal('joe', model.username)
        test.done()
      })
    },
    'should generate based on object blueprint': {
      'single property': function(test) {
        kin.blueprint('User', {
          _model: User,
          username: 'joe'
        })
        kin.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe', model.username)
          test.done()
        })
      },
      'multiple properties': function(test) {
        kin.blueprint('User', {
          _model: User,
          username: 'joe',
          email: 'joe@example.com'
        })
        kin.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe', model.username)
          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
      'numeric properties': function(test) {
          kin.blueprint('User', {
            _model: User,
            _userNum: 3,
            email: function(callback) {
              callback(null, 'user'+this._userNum+'@example.com')
            }
          })
          kin.generate('User', {username: 'bill'}, function(err, model) {
            if (err) throw err
            test.equal('bill', model.username)
            test.equal('user3@example.com', model.email)
            test.done()
          })
        },
      'supplied properties should overwrite blueprint': {
        'single property': function(test) {
          kin.blueprint('User', {
            _model: User,
            username: 'joe'
          })
          kin.generate('User', {username: 'bill'}, function(err, model) {
            if (err) throw err
            test.equal('bill', model.username)
            test.done()
          })
        },
        'multiple properties': function(test) {
          kin.blueprint('User', {
            _model: User,
            username: 'joe',
            email: 'joe@example.com'
          })
          kin.generate('User', {username: 'bill', email: 'bill@example.com'}, function(err, model) {
            if (err) throw err
            test.equal('bill', model.username)
            test.equal('bill@example.com', model.email)
            test.done()
          })
        }, 

        'if blueprint properties don\'t exist': function(test) {
          kin.blueprint('User', {
            _model: User,
            username: 'joe',
          })
          kin.generate('User', {username: 'bill', email: 'bill@example.com'}, function(err, model) {
            if (err) throw err
            test.equal('bill', model.username)
            test.equal('bill@example.com', model.email)
            test.done()
          })
        },
        'if supplied properties don\'t exist': function(test) {
          kin.blueprint('User', {
            _model: User,
            username: 'joe',
            email: 'joe@example.com'
          })
          kin.generate('User', {username: 'bill'}, function(err, model) {
            if (err) throw err
            test.equal('bill', model.username)
            test.equal('joe@example.com', model.email)
            test.done()
          })
        }
      },
      'should generate based on object blueprint with function': function(test) {
        kin.blueprint('User', {
          _model: User,
          username: function(callback) {
            callback(null, 'joe')
          }
        })
        kin.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe', model.username)
          test.done()
        })
      },
      'test can reference other properties via `this` in blueprint function': function(test) {
        kin.blueprint('User', {
          _model: User,
          email: function(callback) {
            callback(null, this.username + '@example.com')
          },
          username: 'joe',
        })
        kin.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe@example.com', model.email)
          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
      'test can reference other function properties via `this` in blueprint function': function(test) {
        kin.blueprint('User', {
          _model: User,
          username: function(callback) {
            callback(null, 'joe')
          },
          email: function(callback) {
            callback(null, this.username + '@example.com')
          }
        })
        kin.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
      'test can reference other properties via `this` in blueprint function when referencing out of order': function(test) {
        kin.blueprint('User', {
          _model: User,
          username: 'joe',
          email2: function(callback) {
            Kin.get(this, 'email', function(err, value) {
              callback(err, value + '@example.com')
            })
          },
          email: function(callback) {
            Kin.get(this, 'username', function(err, value) {
              callback(err, value + '@example.com')
            })
          },
        })
        kin.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe@example.com', model.email)
          test.equal('joe@example.com@example.com', model.email2)
          test.done()
        })
      },
      'test can reference other function properties via `this` in blueprint function when in order': function(test) {
        kin.blueprint('User', {
          _model: User,
          username: function(callback) {
            callback(null, 'joe')
          },
          email: function(callback) {
            callback(null, this.username + '@example.com')
          }
        })
        kin.generate('User', function(err, model) {
          if (err) throw err
          test.equal('joe@example.com', model.email)
          test.done()
        })
      },
    },
    'callback context is the generated object': function(test) {
      kin.blueprint('User', {
        _model: User,
        username: 'joe',
      })
      kin.generate(
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
      kin.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          var stream = new Stream({
            title: 'stream ' + Faker.Company.catchPhrase()
          })
          callback(null, stream._id)
        })
      })
      kin.generate('User', function(err, user) {
        if (err) throw err
        test.equal('joe', user.username)
        test.ok(user.streams && typeof user.streams == 'string')
        test.done()
      })
    },
    'generate can link properties with count': function(test) {
      kin.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          var stream = new Stream({
            title: 'stream ' + Faker.Company.catchPhrase()
          })
          callback(null, stream)
        })
      })
      kin.generate('User', {streams: 3}, function(err, user) {
        if (err) throw err
        test.equal('joe', user.username)
        test.ok(user.streams)
        test.equal(3, user.streams.length)
        test.ok(_.every(user.streams, function(stream) {
          return stream instanceof Stream
        }))
        test.ok(_.every(user.streams, function(stream) {
          return /^stream/.test(stream.title)
        }))
        test.done()
      })
    },
    'generate can link properties with count and generated item': function(test) {
      kin.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      kin.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          kin.generate('Stream', function(err, stream) {
            callback(null, stream._id)
          })
        })
      })
      kin.generate('User', {streams: 6}, function(err, user) {
        if (err) throw err
        test.equal('joe', user.username)
        test.ok(user.streams)
        test.equal(6, user.streams.length)
        test.ok(_.every(user.streams, function(stream) {
          return typeof stream == 'string'
        }))
        test.done()
      })
    },
    'generate with linked properties can override properties': function(test) {
      kin.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      kin.blueprint('User', {
        _model: User,
        username: 'joe',
        streams: (function(callback) {
          kin.generate('Stream', function(err, stream) {
            callback(null, stream._id)
          })
        })
      })
      kin.generate('User', {username: 'bill', streams: 5}, function(err, user) {
        if (err) throw err
        test.equal('bill', user.username)
        test.ok(user.streams)
        test.equal(5, user.streams.length)
        test.ok(_.every(user.streams, function(stream) {
          return typeof stream == 'string'
        }))
        test.done()
      })
    },
    'generate _ properties doesn\'t actually create the property': function(test) {
      kin.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      var streams = []
      var count = 0
      kin.blueprint('User', {
        _model: User,
        _id : uuid(),
        username: 'joe',
        _streams: function(callback) {
          kin.generate('Stream', {title: count++, userId: this._id}, function(err, stream) {
            streams.push(stream)
            callback()
          })
        }
      }),
      kin.generate('User', {_streams: 5}, function(err, user) {
        test.equal('joe', user.username)
        test.ok(!user._streams)
        test.ok(!user.streams)
        test.equal(5, streams.length)
        test.ok(_.every(streams, function(stream) {
          return stream.userId == user._id
        }))
        test.done()
      })
    },
    'generate _ properties doesn\'t actually create the property, and can be referenced': function(test) {
      kin.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      var streams = []
      var count = 0
      var self = this
      kin.blueprint('User', {
        _model: User,
        _id : uuid(),
        username: 'joe',
        _someNumber: 4,
        _streams: function(callback) {
          kin.generate('Stream', {title: this._someNumber.toString(), userId: this._id}, function(err, stream) {
            streams.push(stream)
            callback()
          })
        }
      }),
      kin.generate('User', {_streams: 5}, function(err, user) {
        test.equal('joe', user.username)
        test.ok(!user._streams)
        test.ok(!user.streams)
        test.equal(5, streams.length)
        test.deepEqual(['4', '4', '4', '4', '4'], streams.map(function(stream) {
          return stream.title
        }))
        test.ok(_.every(streams, function(stream) {
          return stream.userId == user._id
        }))
        test.done()
      })
    },
    'generate _ properties doesn\'t actually create the property, but does return it on second non-err param of callback': function(test) {
      kin.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      var streams = []
      var count = 0
      var self = this
      kin.blueprint('User', {
        _model: User,
        _id : uuid(),
        username: 'joe',
        _someNumber: 4,
        _streams: function(callback) {
          kin.generate('Stream', {title: this._someNumber.toString(), userId: this._id}, function(err, stream) {
            streams.push(stream)
            callback(null, stream)
          })
        }
      }),
      kin.generate('User', {_streams: 5}, function(err, user, meta) {
        test.equal('joe', user.username)
        test.ok(meta.streams)
        test.equal(5, streams.length)
        test.deepEqual(meta.streams, streams)
        test.done()
      })
    },
    'handles simple nesting': function(test) {
      kin.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })

      kin.blueprint('User', {
        _model: User,
        _id: new ObjectId().toString(),
        username: Faker.Internet.userName(),
        email: function(callback) {
          callback(null, Faker.Internet.email())
        },
        streams: function(callback) {
          kin.generate('Stream', {_activities: 0}, function(err, stream) {
            callback(null, stream._id)
          })
        }
      })
      kin.generate('User', {streams: 3}, function(err, user) {
        test.equal(3, user.streams.length)
        test.done()
      })
    },
    'handles simple nesting with _ properties': function(test) {
      var titles = []
      kin.blueprint('Stream', {
        _model: Stream,
        _id: new ObjectId().toString(),
        userId: null,
        _title: function(callback) {
          test.strictEqual(this.userId, null)
          titles.push(Faker.Company.catchPhrase())
          callback(null)
        }
      })

      kin.blueprint('User', {
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
          kin.generate('Stream', {_title: 5}, function(err, stream) {
            Kin.get(self, '_id', function(err, id) {
              stream.userId = id
              callback(null, stream)
            })
          })
        }
      })
      kin.generate('User', {streams: 3}, function(err, user) {
        test.equal(3, user.streams.length)
        test.equal(5 * user.streams.length, titles.length)
        test.ok(_.every(user.streams, function(stream) {
          return stream.userId == user._id
        }))
        test.done()
      })
    },
    'handles 3 levels of nesting': function(test) {
      var activities = []
      var count = 0
      kin.blueprint('Stream', {
        _model: Stream,
        _id: function(callback) {
          callback(null, new ObjectId().toString())
        },
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        },
        _activities: function(callback) {
          Kin.get(this, '_id', function(err, id) {
						if (err) throw err
						test.ok(id)
            kin.generate('Activity', {streamId: id}, function(err, activity) {
              activities.push(activity)
              callback(err, activity)
            })
          })
        }
      })
      kin.blueprint('Activity', {
        _model: Activity,
        title: function(callback) {
          callback(null, Faker.Company.catchPhrase())
        }
      })
      kin.blueprint('User', {
        _model: User,
        _id: function(callback) {
          callback(null, new ObjectId().toString())
        },
        username: Faker.Internet.userName(),
        email: function(callback) {
          callback(null, Faker.Internet.email)
        },
        streams: function(callback) {
          kin.generate('Stream', {_activities: 7}, function(err, stream) {
            callback(null, stream._id)
          })
        }
      })
      kin.generate('User', {streams: 3}, function(err, user) {
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
        kin.blueprint('Stream', {
          _model: Stream,
          _id: function(callback) {
            callback(null, new ObjectId().toString())
          },
          title: function(callback) {
            callback(null, Faker.Company.catchPhrase())
          },
          _activities: function(callback) {
            Kin.get(this, '_id', function(err, id) {
							if (err) throw err
							test.ok(id)
              kin.generate('Activity', {streamId: id}, function(err, activity) {
                activities.push(activity)
                callback(err, activity)
              })
            })
          }
        })
        kin.blueprint('Activity', {
          _model: Activity,
          _id: function(callback) {
            callback(null, new ObjectId().toString())
          },
          title: function(callback) {
            callback(null, Faker.Company.catchPhrase())
          }
        })
        kin.blueprint('User', {
          _model: User,
          _id: function(callback) {
            callback(null, new ObjectId().toString())
          },
          username: Faker.Internet.userName(),
          email: function(callback) {
            callback(null, Faker.Internet.email())
          },
          streams: function(callback) {
            kin.generate('Stream', {_activities: 7}, function(err, stream) {
              callback(null, new ObjectId().toString())
            })
          }
        })
        kin.generate('User', {streams: 3}, function(err, user) {
          test.ok(!err)
          test.equal(3, user.streams.length)
          test.equal(user.streams.length * 7, activities.length)
          test.done()
        })
      },
      'should generate valid mongoose models when given string _model': function(test) {
        kin.blueprint('User', {
          _model: 'User',
          username: 'joe'
        })
        kin.generate('User', function(err, model) {
          if (err) throw err

          test.ok(model && model instanceof User)
          test.done()
        })
      }
    }),
    'generator function': {
      'called with no callback, generates a generator function': function(test) {
        kin.blueprint('User', {
          username: 'joe'
        })
        var userGenerator = kin.generate('User')
        test.equal(typeof userGenerator, 'function')
        userGenerator(function(err, user) {
          if (err) throw err
          test.ok(user)
          test.equal(user.username, 'joe')
          test.done()
        })
      },
      'can be passed overridden properties': {
        'when creating generator function': function(test) {
          kin.blueprint('User', {
            username: 'joe'
          })
          var userGenerator = kin.generate('User', {username: 'bob'})
          userGenerator(function(err, user) {
            if (err) throw err
            test.ok(user)
            test.equal(user.username, 'bob')
            test.done()
          })
        },
        'at generate time' : function(test) {
          kin.blueprint('User', {
            username: 'joe'
          })
          var userGenerator = kin.generate('User')
          userGenerator({username: 'bob'}, function(err, user) {
            if (err) throw err
            test.ok(user)
            test.equal(user.username, 'bob')
            test.done()
          })
        },
        'at both function creation and object generation time': function(test) {
          kin.blueprint('User', {
            username: 'joe',
            email: 'joe@example.com'
          })
          var userGenerator = kin.generate('User', {username: 'bob'})
          userGenerator({email: 'bob@example.com'}, function(err, user) {
            if (err) throw err
            test.ok(user)
            test.equal(user.username, 'bob')
            test.done()
          })
        }
      },
      'generator function can have post functions given to it': function(test) {
        kin.blueprint('User', {
          _model: 'User',
          username: 'joe'
        })
        var userGenerator = kin.generate('User')
        userGenerator.post(function(user, meta, callback) {
          user.username = 'bill'
          callback(null, user, meta)
        })
        userGenerator({username: 'bob'}, function(err, user) {
          if (err) throw err
          test.ok(user)
          test.equal(user.username, 'bill')
          test.done()
        })
      },
      'generator function can have multiple post functions given to it': function(test) {
        kin.blueprint('User', {
          _model: 'User',
          username: 'joe'
        })
        var userGenerator = kin.generate('User')
        userGenerator.post(function(user, meta, callback) {
          user.username = 'bill'
          callback(null, user, meta)
        })
        userGenerator.post(function(user, meta, callback) {
          test.equal(user.username, 'bill')
          user.username = user.username + 'gary'
          user.email = 'gary@example.com'
          callback(null, user, meta)
        })
        userGenerator({username: 'bob'}, function(err, user) {
          if (err) throw err
          test.ok(user)
          test.equal(user.username, 'billgary')
          test.equal(user.email, 'gary@example.com')
          test.done()
        })
      },
      'keeps a cache of all generated items': function(test) {
        kin.blueprint('User', {
          username: 'joe'
        })
        var userGenerator = kin.generate('User')
        userGenerator(function(err, user) {
          if (err) throw err
          userGenerator({username: 'bob'}, function(err, user) {
            if (err) throw err
            test.ok(user)
            test.equal(user.username, 'bob')
            test.equal(userGenerator.items.length, 2)
            test.ok(_.find(userGenerator.items, function(user) {
              return user.username == 'bob'
            }))
            test.ok(_.find(userGenerator.items, function(user) {
              return user.username == 'joe'
            }))
            test.done()
          })
        })
      },

    }
  },
  'post functions': {
    'should apply when generating an item': function(test) {
      kin.blueprint('User', {
        _model: User,
        username: 'joe'
      })
      var executed = false
      kin.post('User', function(user, meta, callback) {
        executed = true
        callback(null, user, meta)
      })
      kin.generate('User', function(err, model) {
        test.ok(model)
        test.ok(executed)
        test.done()
      })

    },
    'should apply multiple post functions in order when generating an item': function(test) {
      test.expect(4)
      kin.blueprint('User', {
        _model: User,
        username: 'joe'
      })
      var executed = false
      kin.post('User', function(user, meta, callback) {
        executed = true
        callback(null, user, meta)
      })
      kin.post('User', function(user, meta, callback) {
        test.ok(executed)
        callback(null, user, meta)
      })

      kin.generate('User', function(err, model, meta) {
        test.ok(model)
        test.ok(meta)
        test.ok(executed)
        test.done()
      })
    }
  }
})

module.exports = tests
