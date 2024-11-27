const mongoose = require('mongoose');
const peopleModel = require('../models/peopleModel');
const commitmentModel = require('../models/commitmentsModel');
const env = require('dotenv').config();
const connectDB = async (url)=>{
    try{
      await mongoose.connect(url);
      console.log(`Connected to database: ${mongoose.connection.name}`);
    }
    catch(err){
      console.log(err.message)
    }
    
  }
  connectDB(process.env.DB)
  .then(()=>{
    console.log("The data base has been connected");
  })
  .catch(err=> console.log(err.message))
  
async function check() {
    
    const p =await commitmentModel.deleteMany({ CampainName: 'קמפיין תשפ"ד' });
    console.log(p);
}
async function removeCampaignFromPeople(campaignName) {
    try {
      // Update all people who have the specified campaign name in their Campaigns array
      const result = await peopleModel.updateMany(
        { Campaigns: campaignName },  // Find people who have the campaign name in their array
        { $pull: { Campaigns: campaignName } }  // Remove the specified campaign name from their Campaigns array
      );
  
      console.log(`${result.modifiedCount} people had their ${campaignName} campaign removed.`);
    } catch (error) {
      console.error('Error removing campaign:', error);
    }
  }
  
  // Call the function to remove a specific campaign name
//   removeCampaignFromPeople('קמפיין תשפ"ד');
check();
  
