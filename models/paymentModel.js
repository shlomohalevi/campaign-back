const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  AnashIdentifier: {
    type: String,
    ref: 'People',
    required: [true, 'Identity Number is required']
  },
  CommitmentId:{
    type: String,
    ref: 'Commitment',
    required: [true, 'CommitmentId Number is required']
  },
  Amount: {
    type: Number,
    required: [true, 'Amount Number is required']
  },
  PaymentMethod: {
    type: String,enum: ['מזומן', 'שיק', 'אשראי','הו"ק אשראי','העברה בנקאית','הו"ק בנקאית'],
    required: [true, 'PaymentMethod is required']
  },
  CampainName: {
    type: String,
    ref: 'Campaign'
  },
  Date: {
    type: Date,
    required: [true, 'Date is required']
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
