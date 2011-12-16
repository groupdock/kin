# Kin &emdash Automate Fixture Hierarchies

### Authors
* Tim Oxley https://github.com/secoif
* Geoffrey Donaldson https://github.com/geoffreyd

#  Examples



    
    var Kin = require('../../lib/kin')
    var Faker = require('Faker')
    var assert = require('assert')
    
    var kin = new Kin()



## Fixed Values



Create a User blueprint with fixed values for it's properties

```javascript
kin.blueprint('User', {
  username: 'joe',
  email: 'joe@example.com'
})
```


Generate a User object. The returned user will have the properties supplied in
the template.

```javascript    
kin.generate('User', function(err, user) {
  var expected = {
    username: 'joe',
    email: 'joe@example.com'
  }
  assert.deepEqual(user, expected)
})
```


If we generate another User, we'll get the same values every time

```javascript    
kin.generate('User', function(err, user) {
  kin.generate('User', function(err, anotherUser) {
    assert.equal(anotherUser.username, user.username)
    assert.equal(anotherUser.email, user.email)
  })
})
```


## Dynamic Values



Only generating fixed values isn't very useful. We can define functions to
generate our object properties.

```javascript
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
```


Generating another user should always run the matching generation function,
generating different data each time

```javascript    
kin.generate('User', function(err, user) {
  kin.generate('User', function(err, anotherUser) {
    assert.notEqual(anotherUser.username, user.username)
    assert.notEqual(anotherUser.email, user.email)
  })
})

kin.generate('User', {username: 'bill'}, function(err, user) {
  assert.equal(user.username, 'bill') // uses the overridden value
})
```


## Overriding values at generation time
TODO


## Multiple Values
TODO


