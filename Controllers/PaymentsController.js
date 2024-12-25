

const asyncHandler = require("express-async-handler");
const commitmentsModel = require("../models/commitmentsModel");
const campainModel = require("../models/campaignModel");
const paymentModel = require("../models/paymentModel");
const People = require("../models/peopleModel");
const pettyCash = require("../models/pettyCashModel");
const AppError = require("../utils/AppError");
const mongoose = require("mongoose");
const { recordAddOperation, recordDeleteOperation } = require("../utils/RecordOperation");
const { backupDatabase } = require("../backup/backups/backup");



const validPaymentMethods = [
  'מזומן', , 'העברה בנקאית', 'הבטחה',
  'משולב', 'כרטיס אשראי', 'שיקים', 'לא סופק',
  'הוראת קבע', 'אשראי הו"ק', 'קיזוז', 'החזר תשלום','החזר תשלום מזומן'
];

exports.reviewCommitmentPayments = async (req, res, next) => {
    try {
      const paymentsData = Array.isArray(req.body.data) ? req.body.data : [req.body.data];
      // console.log(paymentsData);
      const campainName = req.body.campainName;
  
      const invalidPayments = [];
      const activePeople = await People.find({ isActive: true });
      const activePeopleMap = new Map(
        activePeople.map((person) => [person.AnashIdentifier, person])
      );
  
      const allCampaigns = await campainModel.find();
      const campaignMap = new Map(allCampaigns.map((campaign) => [campaign.CampainName, campaign]));
  
      const commitments = await commitmentsModel.find();
      const seenPaymentsInFile = new Map();
  
      const existingPayments = await paymentModel.find({}).select('Date PaymentMethod AnashIdentifier Amount -_id').lean();
  
      const existingPaymentsMap = new Map(
        existingPayments.map((payment) => [
          `${new Date(payment.Date).toISOString().split('T')[0]}-${payment.PaymentMethod}-${payment.AnashIdentifier}-${payment.Amount}`,
          payment
        ])
      );
      // console.log(existingPaymentsMap);
      // console.log(paymentsData);
  
      const enrichedPayments = paymentsData.map((payment) => {
        if (!payment.AnashIdentifier) {
          return { ...payment, reason: "מזהה אנש לא סופק" };
        }
        payment.AnashIdentifier = String(payment.AnashIdentifier);
  
        const person = activePeopleMap.get(payment.AnashIdentifier);
        if (!person) {
          return { ...payment, reason: "מזהה אנש לא קיים במערכת או לא פעיל" };
        }
  
        if (campainName && payment.CampainName && payment.CampainName !== campainName) {
          return { ...payment, reason: "שם קמפיין בתשלום שונה משם הקמפיין בדף הקמפיין" };
        }
        payment.CampainName = payment.CampainName || campainName;
  
        const paymentCampain = campaignMap.get(payment.CampainName);
        if (payment.CampainName && !paymentCampain) {
          return { ...payment, reason: `שם קמפיין ${payment.CampainName} לא קיים במערכת` };
        }
  
        if (!payment.Amount) {
          return { ...payment, reason: "סכום התשלום לא סופק" };
        }
        if (payment.Amount === 0) {
          return { ...payment, reason: "סכום התשלום לא יכול להיות 0" };
        }
        if (payment.Amount < 0 && !payment.CampainName && !campainName) {
          return { ...payment, reason: "אין אפשרות לביצוע החזר תשלום בתשלומים ללא התחייבות" };
        }
        if (!payment.PaymentMethod || !validPaymentMethods.includes(payment.PaymentMethod)) {
          return { ...payment, reason: "אופן התשלום לא תקין" };
        }
        if (payment.PaymentMethod === "מזומן" && payment.Amount < 0) {
          return { ...payment, reason: "אין אפשרות לביצוע החזר מזומן בקבצים (רק באופן ידני באתר)" };
        }
        
        if (payment.CampainName) {
          const commitment = getCommitmentOfPayment(payment, commitments);
          // console.log(payment);
          if (!commitment) {
            return { ...payment, reason: `לא קיים לאנש זה התחייבות לקמפיין ${payment.CampainName}` };
          }
          const fieldError = validateAddPaymentFields(payment.Amount, commitment);
          if (fieldError) {
            return { ...payment, reason: fieldError };
          }
        }
        // console.log(payment);
        
        const { Date: paymentDate, PaymentMethod, AnashIdentifier, Amount } = payment;
        if (!paymentDate) {
          return { ...payment, reason: "תאריך התשלום לא סופק" };
        }
        
        const key = `${new Date(paymentDate).toISOString().split('T')[0]}-${PaymentMethod}-${AnashIdentifier}-${Amount}`;
  
        if (seenPaymentsInFile.has(key)) {
          return { ...payment, reason: "תשלום כפול באותו קובץ העלאה " };
        }
        if (existingPaymentsMap.has(key)) {
          return { ...payment, reason: "תשלום כפול כבר קיים במערכת" };
        }
        seenPaymentsInFile.set(key, true);
        
        payment.FirstName = person.FirstName || '';
        payment.LastName = person.LastName || '';
  
        return payment;
      });
  
      const filteredPayments = enrichedPayments.filter((payment) => {
        if (payment.reason) {
          invalidPayments.push(payment);
          return false;
        }
        return true;
      });
      // console.log(enrichedPayments);
  
      const validPaymentsWithCommitment = filteredPayments.filter((payment) => payment.CampainName);
      const validPaymentsWithoutCommitment = filteredPayments.filter((payment) => !payment.CampainName);
  
      res.status(200).json({
        status: "success",
        validPaymentsWithCommitment,
        validPaymentsWithoutCommitment,
        invalidPayments,
      });
    } catch (error) {
      next(error);
    }
  };
  
  exports.uploadPayments = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
  
    try {
      session.startTransaction();

  
      const payments = Array.isArray(req.body) ? req.body : [req.body];
      const paymentsWithCommitment = payments.filter(payment => payment.CampainName);
      const paymentsWithoutCommitment = payments.filter(payment => !payment.CampainName);
      
      if (paymentsWithoutCommitment.length > 0) {
        await handlePaymentsWithoutCommitment(  paymentsWithoutCommitment, req.user, session);
      } 
  
      if (paymentsWithCommitment.length > 0) {
        await handlePaymentsWithCommitment( paymentsWithCommitment, req.user,  session);
      }
  
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({ message: "Payments uploaded successfully" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      next(error);
    }
  });

  async function handlePaymentsWithoutCommitment(payments, user, session) {
    const pettyCashInsertions = [];
    const peopleBulkUpdates = [];
    const people = await People.find().session(session);
    const peopleMap = new Map(people.map(person => [person.AnashIdentifier, person]));
  
  
    for (const payment of payments) {
      if (payment.PaymentMethod === "מזומן" && payment.Amount > 0) {
        const anashName = peopleMap.get(payment.AnashIdentifier);
        insertMoneyForPettyCash(payment, anashName, pettyCashInsertions);
      }
  
      const recordedOperation = recordAddOperation({
        OperationType: payment.Amount > 0 ? "הוספה" : "החזר תשלום",
        Data: payment,
        Desc: payment.Amount > 0 ? "הוספת תשלום ללא התחייבות" : "החזר תשלום",
        Date: new Date(),
        UserFullName: user?.FullName,
      });
  
      const update = {
        $push: {
          PaymentsOperations: {
            $each: [recordedOperation],
            $slice: -20,
          },
        },
      };
  
      peopleBulkUpdates.push({
        updateOne: {
          filter: { AnashIdentifier: payment.AnashIdentifier },
          update,
        },
      });
    }
  
    if (pettyCashInsertions.length > 0) {
      await pettyCash.insertMany(pettyCashInsertions, { session });
    }
  
    if (payments.length > 0) {
      await paymentModel.insertMany(payments, { session });
    }
  
    await People.bulkWrite(peopleBulkUpdates, { session });
  }
  
  // Function to handle payments with commitment
  async function handlePaymentsWithCommitment(payments, user, session) {
    const commitmentsToUpdateMap = new Map();
    const validPayments = [];
    const pettyCashInsertions = [];
    const peopleBulkUpdates = [];
  
    const commitmentIds = [...new Set(payments.map(payment => payment.CommitmentId))];
    const relevantCommitments = await commitmentsModel
      .find({ _id: { $in: commitmentIds } })
      .session(session);
  
    const commitmentMap = new Map(
      relevantCommitments.map(commitment => [commitment._id.toString(), commitment])
    );
  
    const anashIdentifiers = relevantCommitments.map(commitment => commitment.AnashIdentifier);
    const people = await People.find({
      AnashIdentifier: { $in: anashIdentifiers },
    }).session(session);
  
    const peopleMap = new Map(
      people.map(person => [person.AnashIdentifier, person])
    );
  
    for (const payment of payments) {
  
      const commitment = commitmentMap.get(payment.CommitmentId.toString());
  
      if (commitment) {
        payment.CommitmentId = commitment._id;
        validPayments.push(payment);
  
        updateCommitmentFields(payment, commitment, commitmentsToUpdateMap);
  
        const person = peopleMap.get(commitment.AnashIdentifier);
  
        if (payment.PaymentMethod === "מזומן" && payment.Amount > 0) {
          const fullName = `${commitment.FirstName} ${commitment.LastName}`;
          insertMoneyForPettyCash(payment, fullName, pettyCashInsertions);
        }
  
  
        const recordedOperation = recordAddOperation({
          OperationType: "הוספה",
          Data: payment,
          Desc: payment.Amount > 0 ? `הוספת תשלום להתחייבות ${commitment.CampainName} בסך ${payment.Amount} ש"ח` : `החזר תשלום להתחייבות לקמפיין ${commitment.CampainName} בסך ${payment.Amount} ש"ח`,
          Date: new Date(),
          UserFullName: user?.FullName,
        });
  
        const update = {
          $push: {
            PaymentsOperations: {
              $each: [recordedOperation],
              $slice: -20,
            },
          },
        };
  
        peopleBulkUpdates.push({
          updateOne: {
            filter: { _id: person._id },
            update,
          },
        });
      }
    }
  
    const bulkCommitmentsUpdate = Array.from(commitmentsToUpdateMap.values()).map(updateData => ({
      updateOne: {
        filter: { _id: updateData._id },
        update: {
          $set: {
            PaymentsRemaining: updateData.PaymentsRemaining,
            AmountRemaining: updateData.AmountRemaining,
            AmountPaid: updateData.AmountPaid,
            PaymentsMade: updateData.PaymentsMade,
          },
        },
      },
    }));
  
    if (pettyCashInsertions.length > 0) {
      await pettyCash.insertMany(pettyCashInsertions, { session });
    }
  
    await paymentModel.insertMany(validPayments, { session });
    await commitmentsModel.bulkWrite(bulkCommitmentsUpdate, { session });
    await People.bulkWrite(peopleBulkUpdates, { session });
  }



 
  
  exports.uploadCommitmentPayment = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession(); // Start a session for the transaction
    session.startTransaction(); // Begin the transaction
  
    try {
      const payment = req.body;
      const user = req.user; // User triggering the request, assumed to be set by middleware
  
      // Validate Person
      const person = await People.findOne({ AnashIdentifier: payment.AnashIdentifier, isActive: true }).session(session);
      if (!person) {
        throw new AppError(400, 'מזהה אנש לא קיים במערכת או לא פעיל');
      }
  
      // Validate Payment Method
      if (!payment.PaymentMethod || !validPaymentMethods.includes(payment.PaymentMethod)) {
        throw new AppError(400, 'אופן תשלום לא תקין');
      }
  
      // Validate Payment Amount
      if (!payment.Amount || payment.Amount === 0) {
        throw new AppError(400, 'סכום לא תקין');
      }
  
      // Validate Payment Date
      if (!payment.Date) {
        throw new AppError(400, 'תאריך לא סופק');
      }
  
      // Check for Duplicate Payments
      const existingPayments = await paymentModel.find({}).select('Date PaymentMethod AnashIdentifier Amount');
      const existingPaymentsMap = new Map(existingPayments.map(p => [
        `${new Date(p.Date).toISOString().split('T')[0]}-${p.PaymentMethod}-${p.AnashIdentifier}-${p.Amount}`, p,
      ]));
      const key = `${new Date(payment.Date).toISOString().split('T')[0]}-${payment.PaymentMethod}-${payment.AnashIdentifier}-${payment.Amount}`;
      if (existingPaymentsMap.has(key)) {
        throw new AppError(400, 'תשלום כפול קיים במערכת');
      }
  
      let updatedCommitment = null;
  
      // Handle Commitment Update
      if (payment.CampainName) {
        const commitment = await commitmentsModel.findOne({
          AnashIdentifier: payment.AnashIdentifier,
          CampainName: payment.CampainName,
        }).session(session);
  
        if (!commitment) {
          throw new AppError(400, 'התחייבות לא קיימת במערכת');
        }
  
        // Validate Commitment Fields
        const fieldError = validateAddPaymentFields(payment.Amount, commitment);
        if (fieldError) {
          throw new AppError(400, fieldError);
        }
  
        // Update Commitment
        commitment.AmountPaid += parseFloat(payment.Amount);
        commitment.AmountRemaining -= parseFloat(payment.Amount);
        commitment.PaymentsRemaining = commitment.NumberOfPayments
          ? payment.Amount > 0 ? commitment.PaymentsRemaining - 1 : commitment.PaymentsRemaining + 1
          : commitment.PaymentsRemaining;
        commitment.PaymentsMade = payment.Amount > 0 ? commitment.PaymentsMade + 1 : commitment.PaymentsMade - 1;
        payment.CommitmentId = commitment._id;
        updatedCommitment = await commitment.save({ session });
      }
  
      // Add Payment Details to Person
      payment.FirstName = person.FirstName || '';
      payment.LastName = person.LastName || '';
      const newPayment = await paymentModel.create([payment], { session }); // Create payment in transaction
      // Handle Petty Cash
      if (payment.PaymentMethod === 'מזומן'|| payment.PaymentMethod === 'החזר תשלום מזומן') {

        if (payment.Amount > 0) {
          const fullName = `${person.FirstName} ${person.LastName}`;
          const pettyCashTransaction = {
            FullNameOrReasonForIssue: fullName,
            AnashIdentifier: payment.AnashIdentifier,
            Amount: payment.Amount,
            TransactionDate: payment.Date,
            TransactionType: 'הכנסה',
            PaymentId: newPayment[0]._id,
          };
          await pettyCash.create([pettyCashTransaction], { session });
        }
         else {
          const pettyCashPayment = await pettyCash.findOne({
            AnashIdentifier: payment.AnashIdentifier,
            Amount: -payment.Amount,
            TransactionType: 'הכנסה',
          }).session(session);
          if (pettyCashPayment) {
          const res =  await pettyCash.findOneAndDelete({ PaymentId: pettyCashPayment.PaymentId }, { session });
          } else {
            throw new AppError(400, 'תשלום לא קיים בקופה קטנה');
          }
        }
      }
  
      // Log Operation
      const operationDesc = payment.Amount > 0
        ? updatedCommitment
          ? `הוספת תשלום להתחייבות לקמפיין ${updatedCommitment.CampainName} סך תשלום ${payment.Amount} ש`
          : 'הוספת תשלום ללא התחייבות'
        : updatedCommitment
          ? `החזר תשלום להתחייבות לקמפיין ${updatedCommitment.CampainName} סך תשלום ${payment.Amount} ש`
          : 'החזר תשלום ללא התחייבות';
  
      const recordedOperation = recordAddOperation({
        OperationType: payment.Amount > 0 ? 'הוספה' : 'החזר תשלום',
        Desc: operationDesc,
        Data: payment,
        Date: new Date(),
        UserFullName: user?.FullName,
      });
  
      await People.updateOne(
        { AnashIdentifier: person.AnashIdentifier },
        { $push: { PaymentsOperations: { $each: [recordedOperation], $slice: -20 } } },
        { session }
      );
  
      // Commit Transaction
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({
        status: 'success',
        newPayment: newPayment[0],
        updatedCommitment,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError(500, `Transaction failed: ${error.message}`));
    }
  });
  

  exports.deletePayment = asyncHandler(async (req, res, next) => {
    const { paymentId } = req.params;
    const session = await mongoose.startSession(); // Start a transaction session
    session.startTransaction(); // Begin the transaction
  
    try {
      const payment = await paymentModel.findById(paymentId).session(session);
      if (!payment) {
        throw new AppError(404, 'לא נמצא תשלום במערכת');
      }
  
      const person = await People.findOne({ AnashIdentifier: payment.AnashIdentifier, isActive: true }).session(session);
      if (!person) {
        throw new AppError(404, "מזהה אנש לא קיים במערכת או לא פעיל");
      }
  
      let updatedCommitment = null;
      if (payment.CampainName) {
        const commitment = await commitmentsModel.findOne({ AnashIdentifier: payment.AnashIdentifier, CampainName: payment.CampainName }).session(session);
        if (!commitment) {
          throw new AppError(404, "התחייבות לא קיימת במערכת");
        }
  
        const validateDeletedPaymentError = validateDeletePaymentFields(payment.Amount, commitment);
        if (validateDeletedPaymentError) {
          throw new AppError(400, validateDeletedPaymentError);
        }
  
        commitment.AmountPaid -= parseFloat(payment.Amount);
        commitment.AmountRemaining += parseFloat(payment.Amount);
        commitment.PaymentsMade =
          payment.Amount > 0 ? commitment.PaymentsMade - 1 : commitment.PaymentsMade + 1;
        commitment.PaymentsRemaining = commitment.NumberOfPayments
          ? payment.Amount > 0 ? commitment.PaymentsRemaining + 1 : commitment.PaymentsRemaining - 1
          : commitment.PaymentsRemaining;
  
        updatedCommitment = await commitment.save({ session });
      }
  
      const deletedPayment = await paymentModel.findByIdAndDelete(paymentId, { session });
      if (!deletedPayment) {
        throw new AppError(500, "שגיאה במחיקת התשלום");
      }
  
      let desc = '';
      if (payment.Amount > 0) {
        desc = updatedCommitment
          ? `מחיקת תשלום מהתחייבות לקמפיין ${updatedCommitment.CampainName} סך תשלום ${payment.Amount} ש`
          : `מחיקת תשלום ללא התחייבות`;
      } else if (updatedCommitment) {
        desc = `מחיקת החזר תשלום מהתחייבות לקמפיין ${updatedCommitment.CampainName} סך תשלום ${payment.Amount} ש`;
      }
  
      const recordedOperation = recordDeleteOperation({
        OperationType: "מחיקה",
        Data: payment,
        Desc: desc,
        Date: new Date(),
        UserFullName: req.user?.FullName
      });
  
      await People.updateOne(
        { AnashIdentifier: person.AnashIdentifier },
        {
          $push: {
            PaymentsOperations: {
              $each: [recordedOperation],
              $slice: -20,
            }
          }
        },
        { session }
      );
  
      if (payment?.PaymentMethod === "מזומן") {
        const paymentInPettyCash = await pettyCash.findOne({ PaymentId: paymentId }).session(session);
        if (paymentInPettyCash) {
          await pettyCash.findOneAndDelete({ PaymentId: paymentId }, { session });
        }
      }
      if (payment?.PaymentMethod === "החזר תשלום מזומן") {
        const fullName = `${person.FirstName} ${person.LastName}`;
        const pettyCashTransaction = {
          FullNameOrReasonForIssue: fullName,
          AnashIdentifier: payment.AnashIdentifier,
          Amount: -payment.Amount,
          TransactionDate: new Date(),
          TransactionType: 'הכנסה',
          PaymentId: paymentId,
        };
        await pettyCash.create([pettyCashTransaction], { session });
      }
  
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({
        status: "success",
        deletedPayment,
        updatedCommitment,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      next(new AppError(500, "Transaction failed: " + error.message));
    }
  });

  exports.transferPayment = asyncHandler(async (req, res, next) => {
    const { paymentId, campainName } = req.body; // Extract parameters from the request
    const user = req.user; // Assuming the user info is in req.user (e.g., from authentication middleware)
    if (!paymentId || !campainName) {
      return next(new AppError(400, "PaymentId and campainName are required."));
    }
  
    const session = await mongoose.startSession(); // Start a transaction session
    session.startTransaction();
  
    try {
      // Find the payment
      const payment = await paymentModel.findById(paymentId).session(session);
      if (!payment) {
        throw new AppError(404, "תשלום לא קיים במערכת");
      }
  
      // Find the required commitment
      const requiredCommitment = await commitmentsModel.findOne({
        CampainName: campainName,
        AnashIdentifier: payment.AnashIdentifier,
      }).session(session);
  
      if (!requiredCommitment) {
        throw new AppError(404, "ההתחייבות שרוצה להעביר אליה לא נמצאה");
      }
  
      let prevCommitment = null;
  
      // If the payment is already associated with a commitment, update the previous commitment
      if (payment.CommitmentId) {
        prevCommitment = await commitmentsModel.findById(payment.CommitmentId).session(session);
        if (!prevCommitment) {
          throw new AppError(404, "ההתחייבות הנוכחית לא נמצאה");
        }
  
        // Ensure the previous and required commitments are different
        if (prevCommitment._id.equals(requiredCommitment._id)) {
          throw new AppError(400, "התשלום כבר נמצא בהתחייבות הרצויה");
        }
  
        // Validate and update the previous commitment
        const deletePaymentError = validateDeletePaymentFields(payment.Amount, prevCommitment);
        if (deletePaymentError) {
          throw new AppError(400, ` ${deletePaymentError}  לא ניתן למחוק תשלום מההתחייבות הנוכחית`);
        }
  
        prevCommitment.AmountPaid -= parseFloat(payment.Amount);
        prevCommitment.AmountRemaining += parseFloat(payment.Amount);
        prevCommitment.PaymentsMade = payment.Amount > 0 ? prevCommitment.PaymentsMade - 1 : prevCommitment.PaymentsMade + 1;
  
        prevCommitment.PaymentsRemaining = prevCommitment.NumberOfPayments
          ? payment.Amount > 0 ? prevCommitment.PaymentsRemaining + 1 : prevCommitment.PaymentsRemaining - 1
          : prevCommitment.PaymentsRemaining;
  
        await prevCommitment.save({ session });
      }
  
      // Validate and update the required commitment
      const addPaymentError = validateAddPaymentFields(payment.Amount, requiredCommitment);
      if (addPaymentError) {
        throw new AppError(400, ` ${addPaymentError}  לא ניתן להוסיף תשלום להתחייבות הרצויה`);
      }
  
      requiredCommitment.AmountPaid += parseFloat(payment.Amount);
      requiredCommitment.AmountRemaining -= parseFloat(payment.Amount);
      requiredCommitment.PaymentsRemaining = requiredCommitment.NumberOfPayments
        ? payment.Amount > 0 ? requiredCommitment.PaymentsRemaining - 1 : requiredCommitment.PaymentsRemaining + 1
        : requiredCommitment.PaymentsRemaining;
      requiredCommitment.PaymentsMade = payment.Amount > 0 ? requiredCommitment.PaymentsMade + 1 : requiredCommitment.PaymentsMade - 1;
  
      await requiredCommitment.save({ session });
  
      const updatedPayment = await paymentModel.findByIdAndUpdate(
        payment._id,
        { CommitmentId: requiredCommitment._id, CampainName: requiredCommitment.CampainName },
        { new: true, session }
      );
  
      // Record the operation
      const recordedOperation = recordAddOperation({
        OperationType: "העברת תשלום",
        Date: new Date(),
        UserFullName: user.FullName,
        Desc: `העברת תשלום להתחייבות ${requiredCommitment.CampainName}`,
        Data: updatedPayment,
      });
  
      // Update the person's payment operations
      await People.findOneAndUpdate(
        { AnashIdentifier: updatedPayment.AnashIdentifier, isActive: true },
        { $push: { PaymentsOperations: recordedOperation } },
        { new: true, session }
      );
  
      await session.commitTransaction(); // Commit the transaction
      session.endSession();
  
      res.status(200).json({
        message: "Payment transferred successfully",
        updatedPayment,
        prevCommitment,
      });
    } catch (error) {
      await session.abortTransaction(); // Rollback the transaction
      session.endSession();
      next(new AppError(400, error.message)); // Pass the error to the error handling middleware
    }
  });
  
  exports.getPaymentsWithoutCommitment = asyncHandler(async (req, res, next) => {
    const paymentsWithoutCommitment = await paymentModel.find({
      $or: [
        { CampainName: { $exists: false } }, // Field does not exist
        { CampainName: { $eq: "" } }   ,     // Field exists but is an empty string
        { CampainName: { $eq: null } }     // Field exists but is null
      ]
    }).populate({
      path: 'AnashDetails', // Virtual field name
      select: 'Campaigns' // Only include specific fields
    }).sort({ AnashIdentifier: 1 });
  
    res.status(200).json({
      status: "success",
      paymentsWithoutCommitment,
    });
  });
  
    
  
  function getCommitmentOfPayment(payment, commitments) {
    const matchingCommitment = commitments.find(
      commitment => commitment.AnashIdentifier === payment.AnashIdentifier && commitment.CampainName === payment.CampainName
    );
    if (matchingCommitment) {
      payment.CommitmentId = matchingCommitment._id
    }
  
    return matchingCommitment;
  }

  function validateAddPaymentFields(paymentAmount, commitment) {
    // Convert fields to numbers (in case they are strings or undefined)
    const amountPaid = Number(commitment.AmountPaid ?? 0);
    const commitmentAmount = Number(commitment.CommitmentAmount ?? 0);
    const paymentsMade = Number(commitment.PaymentsMade ?? 0);
    const paymentsRemaining = Number(commitment.PaymentsRemaining ?? 0);
    const numberOfPayments = Number(commitment.NumberOfPayments ?? 0);
  
    // Updated values
    const updatedAmountPaid = amountPaid + paymentAmount;
    const updatedAmountRemaining = commitmentAmount - updatedAmountPaid;
    const updatedPaymentsMade = paymentAmount > 0 ? paymentsMade + 1 : paymentsMade - 1;
    const updatedPaymentsRemaining = paymentAmount > 0 ? paymentsRemaining - 1 : paymentsRemaining + 1;
  
  
    // Validation checks
    if (updatedAmountPaid > commitmentAmount) {
      return "סך התשלום חורג מסכום ההתחייבות";
    }
    if (updatedAmountRemaining < 0) {
      return 'סכום התשלום שנותר קטן מ-0';
    }
    if (updatedAmountRemaining > commitmentAmount) {
      return 'הסכום שנותר לתשלום לא יכול לחרוג מסכום ההתחייבות';
    }
    if (numberOfPayments && updatedPaymentsMade > numberOfPayments) {
      return 'מספר התשלומים בפועל לא יכול לעלות על מספר התשלומים הכולל';
    }
    if (numberOfPayments && updatedPaymentsRemaining < 0) {
      return 'מספר התשלומים הנותרים לא יכול להיות פחות מאפס';
    }
    if (numberOfPayments && updatedPaymentsRemaining > numberOfPayments) {
      return 'מספר התשלומים שנותרו גדול מסך התשלומים';
    }
  
    return null;  // No errors, validation passed
  }
  function validateDeletePaymentFields(paymentAmount, commitment,user) {
    const amountPaid = Number(commitment.AmountPaid ?? 0);
    const commitmentAmount = Number(commitment.CommitmentAmount ?? 0);
    const paymentsMade = Number(commitment.PaymentsMade ?? 0);
    const paymentsRemaining = Number(commitment.PaymentsRemaining ?? 0);
    const numberOfPayments = Number(commitment.NumberOfPayments ?? 0);
  
    // Updated values
    const updatedAmountPaid = amountPaid - paymentAmount;
    const updatedAmountRemaining = commitmentAmount - updatedAmountPaid;
    const updatedPaymentsMade = paymentAmount > 0 ? paymentsMade - 1 : paymentsMade + 1;
    const updatedPaymentsRemaining = paymentAmount > 0 ? paymentsRemaining + 1 : paymentsRemaining - 1;
  
  
    // Validation checks
    if (updatedAmountPaid > commitmentAmount) {
      return "סך התשלום חורג מסכום ההתחייבות";
    }
    if (updatedAmountRemaining < 0) {
      return 'סכום התשלום שנותר קטן מ-0';
    }
    if (updatedAmountRemaining > commitmentAmount) {
      return 'הסכום שנותר לתשלום לא יכול לחרוג מסכום ההתחייבות';
    }
    if (numberOfPayments && updatedPaymentsMade > numberOfPayments) {
      return 'מספר התשלומים בפועל לא יכול לעלות על מספר התשלומים הכולל';
    }
    if (numberOfPayments && updatedPaymentsRemaining < 0) {
      return 'מספר התשלומים הנותרים לא יכול להיות פחות מאפס';
    }
    if (numberOfPayments && updatedPaymentsRemaining > numberOfPayments) {
      return 'מספר התשלומים שנותרו גדול מסך התשלומים';
    }
  
    return null;  // No errors, validation passed
  
  
  }

  function validateDeletePaymentFields(paymentAmount, commitment) {
    const amountPaid = Number(commitment.AmountPaid ?? 0);
    const commitmentAmount = Number(commitment.CommitmentAmount ?? 0);
    const paymentsMade = Number(commitment.PaymentsMade ?? 0);
    const paymentsRemaining = Number(commitment.PaymentsRemaining ?? 0);
    const numberOfPayments = Number(commitment.NumberOfPayments ?? 0);
  
    // Updated values
    const updatedAmountPaid = amountPaid - paymentAmount;
    const updatedAmountRemaining = commitmentAmount - updatedAmountPaid;
    const updatedPaymentsMade = paymentAmount > 0 ? paymentsMade - 1 : paymentsMade + 1;
    const updatedPaymentsRemaining = paymentAmount > 0 ? paymentsRemaining + 1 : paymentsRemaining - 1;
  
  
    // Validation checks
    if (updatedAmountPaid > commitmentAmount) {
      return "סך התשלום חורג מסכום ההתחייבות";
    }
    if (updatedAmountRemaining < 0) {
      return 'סכום התשלום שנותר קטן מ-0';
    }
    if (updatedAmountRemaining > commitmentAmount) {
      return 'הסכום שנותר לתשלום לא יכול לחרוג מסכום ההתחייבות';
    }
    if (numberOfPayments && updatedPaymentsMade > numberOfPayments) {
      return 'מספר התשלומים בפועל לא יכול לעלות על מספר התשלומים הכולל';
    }
    if (numberOfPayments && updatedPaymentsRemaining < 0) {
      return 'מספר התשלומים הנותרים לא יכול להיות פחות מאפס';
    }
    if (numberOfPayments && updatedPaymentsRemaining > numberOfPayments) {
      return 'מספר התשלומים שנותרו גדול מסך התשלומים';
    }
  
    return null;  // No errors, validation passed
  
  
  }
  
  

  function insertMoneyForPettyCash(payment, FullNameOrReasonForIssue, pettyCashInsertions) {
    const { Amount, AnashIdentifier, Date: paymentDate } = payment;
    const Type = "הכנסה";
    pettyCashInsertions.push({
      FullNameOrReasonForIssue: FullNameOrReasonForIssue,
      AnashIdentifier: AnashIdentifier,
      TransactionType: Type,
      Amount: Amount,
      TransactionDate: paymentDate,
      PaymentId: payment._id
    });
  
  
  }


  function updateCommitmentFields(payment, commitment, commitmentsToUpdateMap) {
  
    if (!commitmentsToUpdateMap.has(commitment._id.toString())) {
      commitmentsToUpdateMap.set(commitment._id.toString(), {
        _id: commitment._id,
        PaymentsRemaining: commitment.PaymentsRemaining,
        AmountRemaining: commitment.AmountRemaining,
        AmountPaid: commitment.AmountPaid,
        PaymentsMade: commitment.PaymentsMade,
        NumberOfPayments: commitment.NumberOfPayments
      });
    }
  
    const updateData = commitmentsToUpdateMap.get(commitment._id.toString());
    updateData.AmountRemaining -= payment.Amount;
    updateData.AmountPaid += payment.Amount;
    updateData.PaymentsRemaining = updateData.NumberOfPayments ? payment.Amount > 0 ? updateData.PaymentsRemaining - 1 : updateData.PaymentsRemaining + 1 : updateData.PaymentsRemaining;
    updateData.PaymentsMade = payment.Amount > 0 ? updateData.PaymentsMade + 1 : updateData.PaymentsMade - 1
  }
  
  
  
  
  
  
  