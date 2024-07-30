const mongoose = require('mongoose');

const managerSchema = new mongoose.Schema({
  ManagerID: {
    type: Number,
    required: [true, 'Manager ID is required'],
    unique: true
  },
  Username: {
    type: String,
    required: [true, 'Username is required']
  },
  Password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type:String, enum: ['Admin', 'User'], message: "The value must be user or admin", default: 'User',
    required: [true, 'Permission Type is required']
  }
});

const Manager = mongoose.model('Manager', managerSchema);

module.exports = Manager;
