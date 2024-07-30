const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  CampaignID: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'CampaignID is required'],
    unique: true,
    auto: true
  },
  CampaignName: {
    type: String,
    required: [true, 'Campaign Name is required']
  }
});

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
