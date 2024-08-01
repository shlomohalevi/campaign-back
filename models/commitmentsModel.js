const mongoose = require('mongoose');

const commitmentSchema = new mongoose.Schema({
  commitmentId: {
    type: String,
    required: [true, 'Identity Number is required']
  },
  //commitmentid unick
  FundraisingYear: {
    type: Number,
    // required: [true, 'Fundraising Year is required']
  },
  CommitmentAmount: {
    type: Number,
    // required: [true, 'Commitment Amount is required']
  },
  AmountPaid: {
    type: Number,
    // required: [true, 'Amount Paid is required']
  },
  AmountRemaining: {
    type: Number,
    // required: [true, 'Amount Remaining is required']
  },
  NumberOfPayments: {
    type: Number,
    // required: [true, 'Number of Payments is required']
  },
  PaymentsMade: {
    type: Number,
    // required: [true, 'Payments Made is required']
  },
  PaymentsRemaining: {
    type: Number,
    // required: [true, 'Payments Remaining is required']
  },
  Fundraiser: {
    type: String,
    // required: [true, 'Fundraiser is required']
  },
  PaymentMethod: {
    type: String,enum: ['Cash', 'Check', 'CreditCard','DirectDebitCredit','BankTransfer','DirectDebit'],
    // required: [true, 'Payment Method is required']
  },
  Notes: {
    type: String
  },
  ResponseToFundraiser: {
    type: String
  },
  DebtBalance: {
    type: Number,
    // required: [true, 'Debt Balance is required']
  },
  Campaign: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Campaign is required'],
    ref: 'Campaign'
  }
});

const Commitment = mongoose.model('Commitment', commitmentSchema);

module.exports = Commitment;
