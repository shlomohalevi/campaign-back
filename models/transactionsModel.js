const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  PaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    validate: {
      validator: function (value) {
        if(this.TransactionType === 'הכנסה'&& !value) {
          return false;
    }
    return true;
      },
      message: 'PaymentId is required for "הכנסה" transactions'
    }
    
    
  }
  ,
  Date: {
    type: Date,
    // required: [true, 'Date is required']
  },
  TransactionType: {
    type: String,
    enum: ['הכנסה', 'הוצאה']
    // required: [true, 'Operation Type is required']
  },
  User: {
    type: mongoose.Schema.Types.ObjectId,
    // required: [true, 'User is required'],
    ref: 'Manager'
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
