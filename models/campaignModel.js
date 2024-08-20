const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const campaignSchema = new mongoose.Schema({
  CampaignName: {
    type: String,
    required: [true, 'Campaign Name is required']
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  hebrewStartDate: {
    type: String
  },
  hebrewEndDate: {
    type: String  
  }
  });


// campaignSchema.plugin(AutoIncrement, {inc_field: 'CampaignID', startAt: 1, incrementBy: 1});

const Campaign = mongoose.model('Campaign', campaignSchema);



module.exports = Campaign;
