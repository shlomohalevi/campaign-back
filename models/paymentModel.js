const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  AnashIdentifier: {
    type: String,
    ref: 'People',
    required: [true, 'Identity Number is required']
  },
  FirstName: {
    type: String,
    default: '',

  },
  LastName: {
    type: String,
    default: '',
  },
  CommitmentId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commitment',
    // required: [true, 'CommitmentId Number is required']
  },
  Amount: {
    type: Number,
    required: [true, 'Amount Number is required']
  },
  PaymentMethod: {
    type: String,
    enum:  ['מזומן', 'שיקים','העברה בנקאית',
      'הבטחה','משולב','כרטיס אשראי','שיקים','לא סופק','הוראת קבע','אשראי הו"ק','קיזוז','החזר תשלום','החזר תשלום מזומן'],
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

paymentSchema.virtual('AnashDetails', {
  ref: 'People',  // The model to use for population
  localField: 'AnashIdentifier',  // The field in commitments schema
  foreignField: 'AnashIdentifier',  // The field in People schema
  justOne: true  // If you expect only one related document  
});
paymentSchema.set('toObject', { virtuals: true });
paymentSchema.set('toJSON', { virtuals: true });



const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
