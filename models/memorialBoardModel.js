const mongoose = require('mongoose');

const memorialBoardSchema = new mongoose.Schema({
  CustomerID: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Customer ID is required'],
    ref: 'People'
  },
  MemorialDay: {
    type: Date,
    required: [true, 'Memorial Day is required'],
    unique: true
  }
});

const MemorialBoard = mongoose.model('MemorialBoard', memorialBoardSchema);

module.exports = MemorialBoard;
