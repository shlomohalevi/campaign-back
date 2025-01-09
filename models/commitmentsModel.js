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
    type: String,
    // required: [true, 'First Name is required']
  },
  LastName: {
    type: String,
    // required: [true, 'Last Name is required']
  },
  CommitmentAmount: {
    type: Number,
    required: [true, 'Commitment Amount is required']
  },
  AmountPaid: {
    type: Number,
    default: 0,

    required: [true, 'Amount Paid is required']
  },
  AmountRemaining: {
    type: Number,
    required: [true, 'Amount Remaining is required']
  },
  NumberOfPayments: {
    type: Number,
    // required: [true, 'Number of Payments is required']
  },
  PaymentsMade: {
    type: Number,
    required: [true, 'Payments Made is required']
  },
  PaymentsRemaining: {
    type: Number,
    // required: [true, 'Payments Remaining is required']
  },
  Fundraiser: {
    type: String
    // required: [true, 'Fundraiser is required']
  },
  ReceivedGift: {
    type: String,
    
  },
  PaymentMethod: {
    type: String,
    enum:  ['מזומן', 'שיקים','העברה בנקאית',
      'הבטחה','משולב','כרטיס אשראי','שיקים','לא סופק','הוראת קבע','אשראי הו"ק','קיזוז'],
    required: [true, 'Payment Method is required']
  },
  Notes: {
    type: String,
    default: ''
  },
  ResponseToFundraiser: {
    type: String
  },
  MemorialDays: [{
    date: { type: Date, required: true }, // Property 1
    hebrewDate: { type: String, required: true }, // Property 2
    Commeration: { type: String,default: '' } // Property 3
  }],
  CampainName: {
    type: String,
    required: [true, 'Campaign Name is required'],
    
        default: '',
  }
});

// הוספת אינדקס ייחודי על שילוב של campaignName ו-AnashIdentifier
// commitmentSchema.index(
//   { AnashIdentifier: 1, CampainName: 1 },
//   { unique: true, partialFilterExpression: { CampainName: { $ne: '' } } }
// );
commitmentSchema.virtual('person', {
  ref: 'People',  // The model to use for population
  localField: 'AnashIdentifier',  // The field in commitments schema
  foreignField: 'AnashIdentifier',  // The field in People schema
  justOne: true  // If you expect only one related document
});
commitmentSchema.set('toObject', { virtuals: true });
commitmentSchema.set('toJSON', { virtuals: true });


// בדיקה אם המודל כבר קיים כדי למנוע שגיאת OverwriteModelError
const Commitment = mongoose.models.Commitment || mongoose.model('Commitment', commitmentSchema);



module.exports = Commitment;
