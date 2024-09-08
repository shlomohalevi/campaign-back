const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const campaignSchema = new mongoose.Schema({
  campainName: {
    type: String,
    required: [true, 'Campaign Name is required'],
    unique: true  // Ensure campaign names are unique for reference purposes
  },
  startDate: {
    type: Date,
    required: [true, 'Start Date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End Date is required']
  },
  hebrewStartDate: {
    type: String
  },
  hebrewEndDate: {
    type: String
  }
});

// Pre-save hook to check for date overlap
campaignSchema.pre('save', async function (next) {
  const newCampaign = this; // The current campaign being saved

  // Query for campaigns that overlap with the current campaign's dates
  const overlappingCampaign = await mongoose.model('Campaign').findOne({
    $or: [
      // Overlapping conditions: New campaign's start or end falls within an existing campaign's date range
      {
        startDate: { $lt: newCampaign.endDate },
        endDate: { $gt: newCampaign.startDate }
      },
      // Exact start or end date matches
      {
        startDate: newCampaign.startDate // Prevent same start date
      },
      {
        endDate: newCampaign.endDate // Prevent same end date
      }
    ]
    });


  if (overlappingCampaign) {
    // If an overlapping campaign is found, throw an error
    return next(new Error(`The campaign "${overlappingCampaign.campaignName}" has overlapping dates.`));
  }

  // Proceed with saving if no overlap is found
  next();
});

// Optionally, use AutoIncrement for campaign IDs
// campaignSchema.plugin(AutoIncrement, { inc_field: 'CampaignID', startAt: 1, incrementBy: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
