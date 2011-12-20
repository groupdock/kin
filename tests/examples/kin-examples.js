'use strict'

var Kin = require('../../lib/kin')
var Faker = require('Faker')
var assert = require('assert')
var _ = require('underscore')

var uuid = require('node-uuid').v1

var kin = new Kin()

//## Fixed Values

// Create a User blueprint with fixed values for properties
kin.blueprint('User', {
  username: 'joe',
  email: 'joe@example.com'
})

// Generate a User object. The returned user will have the properties
// supplied in the template.
kin.generate('User', function(err, user) {
  assert.deepEqual(user, {username: 'joe', email: 'joe@example.com'})
})

// As expected, if we generate another User, we'll get the same values every time.
kin.generate('User', function(err, user) {
  kin.generate('User', function(err, anotherUser) {
    assert.equal(anotherUser.username, user.username)
    assert.equal(anotherUser.email, user.email)
  })
})

//## Overriding Values at Generation Time

// You can optionally pass a second parameter to `generate`. These values
// will override any values provided in the blueprint.
kin.generate('User', {username: 'bill'}, function(err, user) {
  assert.equal(user.username, 'bill') // uses the overridden value
  assert.equal(user.email, 'joe@example.com') // uses the blueprint value
})

// Overriding properties can also contain keys that aren't specified in
// the original blueprint.
kin.generate('User', {manager: 'alice'}, function(err, user) {
  assert.equal(user.username, 'joe') // uses the blueprint value
  assert.equal(user.email, 'joe@example.com') // uses the blueprint value
  assert.equal(user.manager, 'alice') // non-blueprint key
})


//## Instantiating Custom Models

// Kin can optionally generate custom models for you, so long as your model's
// constructor takes a set of properties. 

// For instance, you might use this as your model's constructor:

/* User Constructor */
var User = function(properties) {
  properties = properties || {}
  this.username = properties.username
  this.email = properties.email || this.username + '@example.com'
}

// Specify the constructor you'd like to use with the special `_model` property.
// *Note:* you won't find the _model property on the generated object.
kin.blueprint('User', {
  _model: User,
  username: function(callback) {
    callback(null, Faker.Internet.userName()) 
  }
})

// Kin will use the supplied constructor when generating this model,
// passing-in any generated values as the first (and only) argument.
kin.generate('User', function(err, user) {
  assert.ok(user.username && user.username.length)
  assert.equal(user.email, user.username + '@example.com') // Test against constructor behaviour to ensure it was used. 
  assert.ok(user instanceof User)
  assert.equal(user._model, undefined) // _model is not stored on the object
})


//## Dynamic Values

// Generating fixed values isn't much fun. We can also 
// define asyncronous functions as dynamic generators for properties.

kin.blueprint('User', {
  username: function(callback) {
    callback(null, Faker.Internet.userName())
  },
  email: function(callback) {
    callback(null, Faker.Internet.email())
  }
})

kin.generate('User', function(err, user) {
  assert.ok(user.username) // some random username as defined by Faker, eg "Rupert_Mertz"
  assert.ok(user.email) // some random email as defined by Faker, eg "Brook_Bednar@price.us"
})

// Generating another user should always run the matching generation
// function, generating different data each time

kin.generate('User', function(err, user) {
  kin.generate('User', function(err, anotherUser) {
    assert.notEqual(anotherUser.username, user.username)
    assert.notEqual(anotherUser.email, user.email)
  })
})

// *Remember* When using a generation function, you must always use a callback to
// return the value, in the standard `err, value` format:
// `callback(err, value1[, value2, value3... valueN])`

//## Multiple Values

// Sometimes we need to generate multiple values for a parent object.
// For example, we might want to generate many tags for a `Document`
// We can setup our `tags` property to create a single 'tag'.
kin.blueprint('Document', {
  content: function(callback) {
    callback(null, Faker.Lorem.sentence()) //  example content
  },
  tags: function(callback) {
    callback(null, Faker.Lorem.words(1).pop()) // generate a single word
  }
})

// Then, you can specify the number you'd like to create when calling `generate`. If the blueprint
// property is a function, and the overridden property is a Number it will call the property
// generator function N times, and will return the results as an array.

kin.generate('Document', {tags: 5}, function(err, document) {
  assert.equal(document.tags.length, 5) // generates a document with 5 tags
})

/* Example output for `kin.generate('Document', {tags: 5})` */
var GeneratedDocumentExample = {
  content: 'perferendis reiciendis sequi qui eum labore',
  tags: [
    'magnam',
    'inventore',
    'facere',
    'ut',
    'rerum'
  ]
}

kin.generate('Document', {tags: 30}, function(err, document) {            
  assert.equal(document.tags.length, 30) // generates a document with 30 tags
})

// ## Nesting Models
// A common use case for generating multiple values is creating
// multi-level model hierarchies.

kin.blueprint('User', {
  username: function(callback) {
    callback(null, Faker.Internet.userName())
  },
  email: function(callback) {
    callback(null, Faker.Internet.email())
  },
  documents: function(callback) {
    kin.generate('Document', {tags: 3}, callback) // Use Kin to generate a document
  }
})

// We can easily generate a `User` with some number of `Document`s by
// simply passing a number as the value of the documents property.

kin.generate('User', {documents: 5}, function(err, user) {
  assert.equal(user.documents.length, 5)
})

/* Example output for kin.generate('User', {documents: 5}) */
var GeneratedUserWithDocumentsExample =
{
  username: 'Lydia',
  email: 'Jaron@angie.biz',
  documents: [
    {
      content: 'velit at earum aut molestiae odio',
      tags: [ 'voluptatem', 'sunt', 'modi' ]
    },
    {
      content: 'eum facilis corrupti possimus qui quia',
      tags: [ 'illo', 'qui', 'dignissimos' ]
    },
    {
      content: 'debitis et nisi aut vero illo rem',
      tags: [ 'magnam', 'sunt', 'quia' ]
    },
    {
      content: 'non iusto ratione sed',
      tags: [ 'earum', 'provident', 'voluptatem' ]
    },
    {
      content: 'aut maxime aspernatur expedita aut voluptates',
      tags: [ 'voluptas', 'quo', 'et' ]
    }
  ]
}


// In a real environment, you might persist your generated models to the database and
// instead of embedding entire objects, you only store a reference to
// them via their `_id`.

// *Note:* Kin has built-in support for Mongoose models, you can specify Model
// types by the name you provided when you generated the mongoose.model.
// So long as Kin can find the collection via mongoose.models, you can
// use a String instead of a Model reference. This is implemented to
// save you having to manually `require` every model in your system.


/* Saving items might look something like this if you're using an ORM like Mongoose. */

var mongoose = require('mongoose')
mongoose.connect('kin_examples')

// If you want to use mongoose with Kin, you need to pass your reference to mongoose to Kin

kin.mongoose = mongoose

/* Some fixtures we prepared earlier */
var User = require('../fixtures').User // Same as our user before, except as a Mongoose model
var Stream = require('../fixtures').Stream // Imagine a stream is like an RSS feed containing 'Activities'
var Activity = require('../fixtures').Activity // each Activity references a Stream ID

kin.blueprint('Stream', {
  _model: 'Stream',
  title: function(callback) {
    callback(null, Faker.Lorem.words(1).pop())
  }
})

kin.blueprint('User', {
  _model: 'User', // Note use of a String here
  username: function(callback) {
    callback(null, Faker.Internet.userName())
  },
  email: function(callback) {
    callback(null, Faker.Internet.email())
  },
  streams: function(callback) { // references to streams
    kin.generate('Stream', function(err, stream) {
      stream.save(function(err, savedStream) { // save the generated stream
        callback(null, stream._id)
      })
    })
  }
})

kin.generate('User', function(err, user) {
  _.each(user.streams, function(streamId) {
    /* The streams we generated should be saved in the DB */
    Stream.findById(streamId, function(err, found) {
      assert.ok(found)
    })
  })
})

// ## Referencing other properties

// 
// If you want to reference another property from within a generator,
// use `Kin.get(this, 'someProperty')`. 
//
// Because we 'simultaneously' execute each generator function, there's no guarantee that the generator 
// will have run by the time we're referencing it within another property generator.
// `Kin.get` ensures the property's generator has returned a value.


// ## Hidden or Meta properties
// all properties beginning with an _ are not saved on the object, and
// instead are returned in the `generate` callback as properties of a 
// third parameter, without the _ prefix.

var ObjectId = mongoose.Types.ObjectId

kin.blueprint('User', {
  _documents: function(callback) {
    kin.generate('Document', {tags: 3}, callback)
  },
  title: function(callback) {
    callback(null, Faker.Lorem.words(1).pop())
  }
})

kin.generate('User', {_documents: 4}, function(err, user, meta) {
  assert.equal(user._documents, undefined)
  assert.equal(meta.documents.length, 4)
})


// ## Applying post processing to a generator

// Sometimes you always want to apply a certain action to every model generated
// by your kin instance. e.g. saving a model. Kin allows you to apply 'post' 
// functions for exactly this situation. *Remember* you must call the callback
// with the 'meta' property if you want to keep your meta data.

var ObjectId = mongoose.Types.ObjectId

kin.blueprint('User', {
  _model: 'User',
  _streams: function(callback) {
    kin.generate('Stream', callback)
  },
  title: function(callback) {
    callback(null, Faker.Lorem.words(1).pop())
  }
})
kin.post('User', function(user, meta, callback) {
  user.save(function(saveErr, user) {
    callback(saveErr, user, meta)
  })
})
kin.generate('User', {_streams: 0}, function(err, user, meta) {
  // ensure user was saved
  User.findById(user._id, function(err, found) {
    assert.ok(found)
  })
})

// Example: if you also want to save nested items, you could do
// this in the 'top level' generator's post function (e.g. save documents via 
// documents stored in the meta parameter in User's post function)

kin.post('User', function(user, meta, callback) {
  user.save(function(saveErr, user) {
    var numSavedStreams = 0
    for(var i = 0; i < meta.streams.length; i++) {
      var stream = meta.streams[i]
      var streamSaveErrs
      stream.save(function(streamSaveErr) {
        streamSaveErrs = streamSaveErr
        numSavedStreams++
        if (numSavedStreams == meta.streams.length) {
          callback(saveErr || streamSaveErrs, user, meta)
        }
      })
    }
  })
})

kin.generate('User', {_streams: 3}, function(err, user, meta) {
  // ensure user was saved
  User.findById(user._id, function(err, found) {
    assert.ok(found)
  })
  // ensure our 3 streams were saved
  Stream.find(function(err, found) {
    assert.equal(found.length, 3)
  })
})



