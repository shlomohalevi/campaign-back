const mongoose = require('mongoose');

const pettyCashSchema = new mongoose.Schema({
  TransactionId: {
    type: String,
    required: [true, 'Transaction Number is required'],
    unique: true
    //ref to transactions
  },
  TransactionType: {//enum?
    type: String,
    // required: [true, 'Transaction Type is required']
  },
  Amount: {
    type: Number,
    // required: [true, 'Amount is required']
  },
  CustomerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'People'
  }
});

const PettyCash = mongoose.model('PettyCash', pettyCashSchema);

module.exports = PettyCash;
