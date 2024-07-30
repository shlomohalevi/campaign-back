const mongoose = require('mongoose');
const peopleSchema = new mongoose.Schema({
    CustomerID: {
      type: String,
      required: [true, 'CustomerID is required'],
      unique: true
    },
    FirstName: {
      type: String,
      required: [true, 'First Name is required']
    },
    LastName: {
      type: String,
      required: [true, 'Last Name is required']
    },
    Address: {
      type: String,
      required: [true, 'Address is required']
    },
    City: {
      type: String,
      required: [true, 'City is required']
    },
    MobilePhone: {
      type: String,
      required: [true, 'Mobile Phone is required']
    },
    HomePhone: {
      type: String,
      required: [true, 'Home Phone is required']
    },
    MobileHomePhone: {
      type: String,
      required: [true, 'Mobile Home Phone is required']
    },
    FatherName: {
      type: String,
      required: [true, 'Father Name is required']
    },
    FullNameForLists: {
      type: String,
      required: [true, 'Full Name for Lists is required']
    },
    Matrimony: {
      type: String,
      required: [true, 'Matrimony is required']
    },
    CommitteeResponsibility: {
      type: String,
      required: [true, 'Committee Responsibility is required']
    },
    PartyGroup: {
      type: String,
      required: [true, 'Party Group is required']
    },
    StudiedInYeshivaYears: {
      type: String,
      required: [true, 'Studied in Yeshiva Years is required']
    },
    DonationMethod: {
      type: String,
      required: [true, 'Donation Method is required']
    },
    GradeAYear: {
      type: String,
      required: [true, 'Grade A Year is required']
    },
    GroupNumber: {
      type: String,
      required: [true, 'Group Number is required']
    },
    IdentityNumber: {
      type: String,
      required: [true, 'Identity Number is required']
    },
    Classification: {
      type: String,
      required: [true, 'Classification is required']
    },
    BeitMidrash: {
      type: String,
      required: [true, 'Beit Midrash is required']
    },
    PeopleIdentifier: {
      type: String,
      required: [true, 'People Identifier is required']
    },
    PartyInviterName: {
      type: String,
      required: [true, 'Party Inviter Name is required']
    },
    ActiveInactive: {
      type: Number,
      required: [true, 'Active/Inactive status is required'],
      default: 1
    },
    Email: {
      type: String,
      required: [true, 'Email is required']
    },
    FreeFieldsToFillAlone: {
      type: String,
      required: [true, 'Free Fields to Fill Alone is required']
    },
    AnotherFreeFieldToFillAlone: {
      type: String,
      required: [true, 'Another Free Field to Fill Alone is required']
    },
    PhoneNotes: {
      type: String,
      required: [true, 'Phone Notes are required']
    },
    Campaigns: {
      type: [mongoose.Schema.Types.ObjectId],
      required: [true, 'Campaigns are required'],
      ref: 'Campaign'
    }
  });

  const People = mongoose.model('People', peopleSchema);

module.exports = People;
  