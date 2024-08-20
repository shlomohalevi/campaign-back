const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  AnashIdentifier: {
    type: String,
    ref: 'People'
  },
  PersonID: {
    type: String,
    ref: 'People'
  },
  CommitmentId:{
    type: String,
    ref: 'Commitment'},

  Amount: {
    type: Number
  },
  PaymentMethod: {
    type: String,enum: ['Cash', 'Check', 'CreditCard','DirectDebitCredit','BankTransfer','DirectDebit'],
    
  },
  Campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  Date: {
    type: Date
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
