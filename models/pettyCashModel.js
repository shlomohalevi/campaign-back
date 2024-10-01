const mongoose = require('mongoose');

const pettyCashSchema = new mongoose.Schema({
  FullNameOrReasonForIssue: {
    type: String,
    required: [true, 'FullNameOrReasonForIssue is required']
  },
  AnashIdentifier: {
    type: String,
    ref: 'People',
    required: [true, 'Identity Number is required']
  },
  TransactionType: {
    type: String,
    enum: ['הכנסה', 'הוצאה'],
    required: [true, 'Transaction Type is required']
  },
  Amount: {
    type: Number,
    required: [true, 'Amount is required']
  },
  TransactionDate: {
    type: Date,
    required: [true, 'TransactionDate is required']
  },
});

const PettyCash = mongoose.models.PettyCash || mongoose.model('PettyCash', pettyCashSchema);

module.exports = PettyCash;
