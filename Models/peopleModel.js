const mongoose = require('mongoose');
const { schema } = require('./transactionsModel');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const operetionsSchema = new mongoose.Schema({
  Date: {
    type: Date,
    required: [true, 'Date is required']
  },
  OperationType: {
    type: String,
    required: [true, 'Operation Type is required']
  },
  OldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  NewValue: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  UserFullName: {
    type: String,
    required: [true, 'UserFullName is required'],
  }
});


const peopleSchema = new mongoose.Schema({
  AnashIdentifier: {
    type: String,
    required: [true, 'People Identifier is required'],
    unique: true
  },
  FirstName: {
    type: String,
    default: '',
    // required: [true, 'First Name is required']
  },
  LastName: {
    type: String,
    default: '',
    // required: [true, 'Last Name is required']
  },
  Address: {
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
    // default: '',
    sparse: true,
    unique: true,
    trim: true
    
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
    default: true,
    set: function(v) {
      // If the value is null, undefined, or an empty string, set it to true
      return v === null || v === undefined || v === '' ? true : v;
    },
  },
  // other fields...
  
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
    type: String,
    ref: 'Campaign',
    validate: {
      validator: function(v) {
        // כאן 'this.Campaigns' מתייחס למערך Campaigns בתוך המסמך
        return this.Campaigns.includes(v);
      },
      message: props => `${props.value} כבר קיים במערך הקמפיינים`
    }
}]
,
  Operations: [operetionsSchema]
  ,
  Rank: {
    type: String,
    default: ''
  }


});

// peopleSchema.index(
//   { PersonID: 1 },
//   { 
//     unique: true,
//     partialFilterExpression: { 
//       PersonID: { 
//         $exists: true,
//         $ne: null,
//         $ne: ""
//       }
//     },
//   }
// );

  



const People = mongoose.model('People', peopleSchema);


module.exports = People;
