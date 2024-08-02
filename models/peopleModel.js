const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const peopleSchema = new mongoose.Schema({
    PersonID: {
      type: Number,
      // required: [true, 'personID is required'],
      // unique: true
    },
    anashIdentifier: {
      type: String,
      required: [true, 'People Identifier is required'],
      unique: true
    },
    FirstName: {
      type: String,
      // required: [true, 'First Name is required']
    },
    LastName: {
      type: String,
      // required: [true, 'Last Name is required']
    },
    Address: {
      type: String,
      // required: [true, 'Address is required']
    },
    City: {
      type: String,
      // required: [true, 'City is required']
    },
    MobilePhone: {
      type: String,
      // required: [true, 'Mobile Phone is required']
    },
    HomePhone: {
      type: String,
      // required: [true, 'Home Phone is required']
    },
    MobileHomePhone: {
      type: String,
      // required: [true, 'Mobile Home Phone is required']
    },
    FatherName: {
      type: String,
      // required: [true, 'Father Name is required']
    },
    FullNameForLists: {
      type: String,
      // required: [true, 'Full Name for Lists is required']
    },
    fundRaiser: {
      type: String,
      // required: [true, 'Matrimony is required']
    },
    CommitteeResponsibility: {
      type: String,
      // required: [true, 'Committee Responsibility is required']
    },
    PartyGroup: {
      type: String,
      // required: [true, 'Party Group is required']
    },
    StudiedInYeshivaYears: {
      type: String,
      // required: [true, 'Studied in Yeshiva Years is required']
    },
    DonationMethod: {
      type: String
      // required: [true, 'Donation Method is required']
    },
    GradeAYear: {
      type: String
      // required: [true, 'Grade A Year is required']
    },
    GroupNumber: {
      type: String,
      // required: [true, 'Group Number is required']
    },
    IdentityNumber: {
      type: String,
      // required: [true, 'Identity Number is required'],
      // unique: true
    },
    Classification: {
      type: String,
      // required: [true, 'Classification is required']
    },
    BeitMidrash: {
      type: String,
      // required: [true, 'Beit Midrash is required']
    },
    PartyInviterName: {
      type: String,
      // required: [true, 'Party Inviter Name is required']
    },
    isActive: {
      type: Number,
      // required: [true, 'Active/Inactive status is required'],
      // default: false
    },
    Email: {
      type: String,
      // required: [true, 'Email is required'],
      // unique: true
    },
    FreeFieldsToFillAlone: {
      type: String,
      // required: [true, 'Free Fields to Fill Alone is required']
    },
    AnotherFreeFieldToFillAlone: {
      type: String,
      // required: [true, 'Another Free Field to Fill Alone is required']
    },
    PhoneNotes: {
      type: String,
      // required: [true, 'Phone Notes are required']
    },
    Campaigns: {
      type: Map,
      of: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
      },
      // required: [true, 'Campaigns are required']
    }
    });
    peopleSchema.plugin(AutoIncrement, { inc_field: 'PersonID', start_seq: 1 });


  const People = mongoose.model('People', peopleSchema);

module.exports = People;
  