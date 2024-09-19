const mongoose = require('mongoose');
const { schema } = require('./transactionsModel');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const peopleSchema = new mongoose.Schema({
    AnashIdentifier: {
      type: Number,
      required: [true, 'People Identifier is required'],
      unique: true
    },
    FirstName: {
      type: String,
      default: '',
      required: [true, 'First Name is required']
    },
    LastName: {
      type: String,
      default: '',
      required: [true, 'Last Name is required']
    },
    address: {
      type: String,
      default: ''
    },
    City: {
      type: String,
      default: ''
    },
    MobilePhone: {
      type: String,
      default: ''
    },
    HomePhone: {
      type: String,
      default: ''
    },
    MobileHomePhone: {
      type: String,
      default: ''
    },
    FatherName: {
      type: String,
      default: ''
    },
    FullNameForLists: {
      type: String,
      default: ''
    },
    fundRaiser: {
      type: String,
      default: ''
    },
    CommitteeResponsibility: {
      type: String,
      default: ''
    },
    PartyGroup: {
      type: String,
      default: ''
    },
    StudiedInYeshivaYears: {
      type: String,
      default: ''
    },
    yashagYear: {
      type: String,
      default: ''
    },
    DonationMethod: {
      type: String,
      default: ''
    },
    GradeAYear: {
      type: String,
      default: ''
    },
    GroupNumber: {
      type: String,
      default: ''
    },
    PersonID: {
      type: String,
      default: '',
      unique: true,
      // required: [true, 'PersonID is required'],
    },
    Classification: {
      type: String,
      default: ''
    },
    BeitMidrash: {
      type: String,
      default: ''
    },
    PartyInviterName: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    Email: {
      type: String,
      default: ''
    },
    FreeFieldsToFillAlone: {
      type: String,
      default: ''
    },
    AnotherFreeFieldToFillAlone: {
      type: String,
      default: ''
    },
    PhoneNotes: {
      type: String,
      default: ''
    },
    AddressNumber: {
      type: Number,
      default: ''
    },
    floor: {
      type: String,
      default: ''
    }
    ,
    zipCode: {
      type: String,
      default: ''
    }
    ,
    Campaigns: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    }]
    
        });


  const People = mongoose.model('People', peopleSchema);

module.exports = People;
  