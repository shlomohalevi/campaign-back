const mongoose = require('mongoose');
const { schema } = require('./transactionsModel');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const peopleSchema = new mongoose.Schema({
  PersonID: {
    type: Number,
    // required: [true, 'Person ID is required'],
    unique: true
  },
    anashIdentifier: {
      type: Number,
      required: [true, 'People Identifier is required'],
      unique: true
    },
    FirstName: {
      type: String,
      default: ''
      // required: [true, 'First Name is required']
    },
    LastName: {
      type: String,
      default: ''
      // required: [true, 'Last Name is required']
    },
    Address: {
      type: String,
      default: ''
      // required: [true, 'Address is required']
    },
    City: {
      type: String,
      default: ''
      // required: [true, 'City is required']
    },
    MobilePhone: {
      type: String,
      default: ''

      // required: [true, 'Mobile Phone is required']
    },
    HomePhone: {
      type: String,
      default: ''
      // required: [true, 'Home Phone is required']
    },
    MobileHomePhone: {
      type: String,
      default: ''
      // required: [true, 'Mobile Home Phone is required']
    },
    FatherName: {
      type: String,
      default: ''
      // required: [true, 'Father Name is required']
    },
    FullNameForLists: {
      type: String,
      default: ''
      // required: [true, 'Full Name for Lists is required']
    },
    fundRaiser: {
      type: String,
      default: ''
      // required: [true, 'Matrimony is required']
    },
    CommitteeResponsibility: {
      type: String,
      default: ''
      // required: [true, 'Committee Responsibility is required']
    },
    PartyGroup: {
      type: String,
      default: ''
      // required: [true, 'Party Group is required']
    },
    StudiedInYeshivaYears: {
      type: String,
      default: ''
      // required: [true, 'Studied in Yeshiva Years is required']
    },
    yashagYear: {
      type: String,
      default: ''
      // required: [true, 'Yashag Year is required']
    },
    DonationMethod: {
      type: String,

      default: ''

      // required: [true, 'Donation Method is required']
    },
    GradeAYear: {
      type: String,
      default: ''
      // required: [true, 'Grade A Year is required']
    },
    GroupNumber: {
      type: String,
      default: ''
      // required: [true, 'Group Number is required']
    },
    IdentityNumber: {
      type: String,
      default: '',
      // required: [true, 'Identity Number is required'],
      unique: true
    },
    Classification: {
      type: String,
      default: ''
      // required: [true, 'Classification is required']
    },
    BeitMidrash: {
      type: String,
      default: ''
      // required: [true, 'Beit Midrash is required']
    },
    PartyInviterName: {
      type: String,
      default: ''
      // required: [true, 'Party Inviter Name is required']
    },
    isActive: {
      type: Boolean,
      // required: [true, 'Active/Inactive status is required'],
      default: true
    },
    Email: {
      type: String,
      default: ''
      // required: [true, 'Email is required'],
      // unique: true
    },
    FreeFieldsToFillAlone: {
      type: String,
      default: ''
      // required: [true, 'Free Fields to Fill Alone is required']
    },
    AnotherFreeFieldToFillAlone: {
      type: String,
      default: ''
      // required: [true, 'Another Free Field to Fill Alone is required']
    },
    PhoneNotes: {
      type: String,
      default: ''
      // required: [true, 'Phone Notes are required']
    },
    addressNumber: {
      type: Number,
      default: ''
      
      // required: [true, 'adresNumber is required']
    },
    floor: {
      type: String,
      default: ''
      // required: [true, 'floor is required']
    }
    ,
    zipCode: {
      type: String,
      default: ''
      // required: [true, 'postalCode is required']
    }
    ,
    Campaigns: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    }]
    
        });
    peopleSchema.plugin(AutoIncrement, {inc_field: 'PersonID', startAt: 1, incrementBy: 1});

    // peopleSchema.plugin(AutoIncrement, { inc_field: 'personid' });

  const People = mongoose.model('People', peopleSchema);

module.exports = People;
  