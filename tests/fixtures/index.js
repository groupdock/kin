var mongoose = require('mongoose'),
    Schema = mongoose.Schema

var ActivitySchema = new Schema({
  title: String
})
var StreamSchema = new Schema({
  title: String
})
var UserSchema = new Schema({
  username: String,
  email: String,
  streams: [{ type: Schema.ObjectId, ref: 'Stream', index: true}],
})

exports.Activity = mongoose.model('Activity', ActivitySchema)
exports.Stream = mongoose.model('Stream', StreamSchema)
exports.User = mongoose.model('User', UserSchema)
