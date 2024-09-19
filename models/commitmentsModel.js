const mongoose = require('mongoose');

const commitmentSchema = new mongoose.Schema({
  AnashIdentifier: {
    type: String,
    ref: 'People',
    required: [true, 'Identity Number is required']
  },
  PersonID: {
    type: String,
    ref: 'People'
  },
  FirstName: {
    type: String
    // required: [true, 'First Name is required']
  },
  LastName: {
    type: String
    // required: [true, 'Last Name is required']
  },
  CommitmentAmount: {
    type: Number
    // required: [true, 'Commitment Amount is required']
  },
  AmountPaid: {
    type: Number
    // required: [true, 'Amount Paid is required']
  },
  AmountRemaining: {
    type: Number
    // required: [true, 'Amount Remaining is required']
  },
  NumberOfPayments: {
    type: Number
    // required: [true, 'Number of Payments is required']
  },
  PaymentsMade: {
    type: Number
    // required: [true, 'Payments Made is required']
  },
  PaymentsRemaining: {
    type: Number
    // required: [true, 'Payments Remaining is required']
  },
  Fundraiser: {
    type: String
    // required: [true, 'Fundraiser is required']
  },
  PaymentMethod: {
    type: String,enum: ['מזומן', 'שיק', 'אשראי','הו"ק אשראי','העברה בנקאית','הו"ק בנקאית'],
    // required: [true, 'Payment Method is required']
  },
  Notes: {
    type: String
  },
  ResponseToFundraiser: {
    type: String
  },
  MemorialDay: {
    type: Date
  },
  Commemoration: {
    type: String
  },
  CampainName: {
    type: String,
    default: '',
  }
});

// הוספת אינדקס ייחודי על שילוב של campaignName ו-AnashIdentifier
commitmentSchema.index(
  { AnashIdentifier: 1, CampainName: 1 },
  { unique: true, partialFilterExpression: { CampainName: { $ne: '' } } }
);

const Commitment = mongoose.model('Commitment', commitmentSchema);

module.exports = Commitment;
