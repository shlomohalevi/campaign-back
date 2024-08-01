const mongoose = require('mongoose');

const memorialBoardSchema = new mongoose.Schema({
  CustomerID: {
    type: String,
    required: [true, 'Customer ID is required'],
    ref: 'People'
  },
  //id 
  MemorialDay: {
    type: Date,
    required: [true, 'Memorial Day is required'],
    unique: true
  }
});

const MemorialBoard = mongoose.model('MemorialBoard', memorialBoardSchema);

module.exports = MemorialBoard;
