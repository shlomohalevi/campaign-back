const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  PersonID: {
    type: String,
    ref: 'People'
  },
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
