const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  TransactionId: {
    type: Number,
    required: [true, 'Transaction Number is required'],
    unique: true
  },
  Date: {
    type: Date,
    // required: [true, 'Date is required']
  },
  OperationType: {
    type: String,//enum?
    // required: [true, 'Operation Type is required']
  },
  Location: {
    type: String,
    // required: [true, 'Location is required']
  },
  User: {
    type: mongoose.Schema.Types.ObjectId,
    // required: [true, 'User is required'],
    ref: 'Manager'
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
