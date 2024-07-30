const mongoose = require('mongoose');

const pettyCashSchema = new mongoose.Schema({
  TransactionNumber: {
    type: Number,
    required: [true, 'Transaction Number is required'],
    unique: true
  },
  TransactionType: {
    type: String,
    required: [true, 'Transaction Type is required']
  },
  Amount: {
    type: Number,
    required: [true, 'Amount is required']
  },
  CustomerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'People'
  }
});

const PettyCash = mongoose.model('PettyCash', pettyCashSchema);

module.exports = PettyCash;
