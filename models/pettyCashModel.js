const mongoose = require('mongoose');

const pettyCashSchema = new mongoose.Schema({
  TransactionId: {
    type: String,
    required: [true, 'Transaction Number is required'],
    unique: true
    //ref to transactions
  },
  TransactionType: {
    type: String,
    enum: ['Income', 'Expense']
    // required: [true, 'Transaction Type is required']
  },
  Amount: {
    type: Number,
    // required: [true, 'Amount is required']
  },
  FullNameForLists: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'People'
  }
});

const PettyCash = mongoose.model('PettyCash', pettyCashSchema);

module.exports = PettyCash;
