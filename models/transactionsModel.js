const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  TransactionNumber: {
    type: Number,
    required: [true, 'Transaction Number is required'],
    unique: true
  },
  Date: {
    type: Date,
    required: [true, 'Date is required']
  },
  Time: {
    type: String,
    required: [true, 'Time is required']
  },
  OperationType: {
    type: String,
    required: [true, 'Operation Type is required']
  },
  User: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User is required'],
    ref: 'Manager'
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
