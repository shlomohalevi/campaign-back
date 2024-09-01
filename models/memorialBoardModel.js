const mongoose = require('mongoose');

const memorialBoardSchema = new mongoose.Schema({
  anashIdentifier: {
    type: String,
    required: [true, 'Customer ID is required'],
    ref: 'People'
  },
  commemoration: {
    type: String
  },
  memorialDay: {
    type: Date,
    required: [true, 'Memorial Day is required'],
    unique: true
  },
  campaignName: {  // Use String to match the campaignName in Campaign schema
    type: String,
    required: [true, 'Campaign Name is required'],
    ref: 'Campaign'
  }
});

const MemorialBoard = mongoose.model('MemorialBoard', memorialBoardSchema);

module.exports = MemorialBoard;
