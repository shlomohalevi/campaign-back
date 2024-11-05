const mongoose = require('mongoose');

const managerSchema = new mongoose.Schema({
  Username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true
  },
  Email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true
  },
  FullName : {
    type: String,
    required: [true, 'FullName is required']
  }
  ,
  Password: {
    type: String,
    required: [true, 'Password is required']
  },
  Role: {
    type:String, enum: ['Admin', 'User'], message: "The value must be user or admin", default: 'User',
    required: [true, 'Permission Type is required']
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }

});

const Manager = mongoose.model('manegers', managerSchema);

module.exports = Manager;
