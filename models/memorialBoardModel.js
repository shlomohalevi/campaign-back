const mongoose = require('mongoose');

const memorialBoardSchema = new mongoose.Schema({
  FullNameForLists: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Customer ID is required'],
    ref: 'People'
  },
  //id 
  MemorialDay: {
    type: Date,
    required: [true, 'Memorial Day is required'],
    unique: true
  },
  CampaignName: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Campaign Name is required'],
    ref: 'Campaign'
  }
});

const MemorialBoard = mongoose.model('MemorialBoard', memorialBoardSchema);

module.exports = MemorialBoard;
