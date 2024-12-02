const mongoose = require('mongoose');

const pettyCashSchema = new mongoose.Schema({
  FullNameOrReasonForIssue: {
    type: String,
    required: [true, 'FullNameOrReasonForIssue is required']
  },
  AnashIdentifier: {
    type: String,
    ref: 'People',
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
  PaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    // validate: {
    //   validator: function (value) {
    //     if(this.TransactionType === 'הכנסה'&& !value) {
    //       return false;
    // }
    // return true;
    //   },
    //   message: 'PaymentId is required for "הכנסה" transactions'
    // }
    
    
  }

  
});

const PettyCash = mongoose.models.PettyCash || mongoose.model('PettyCash', pettyCashSchema);

module.exports = PettyCash;
