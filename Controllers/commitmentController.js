const asyncHandler = require("express-async-handler");
const commitmentsModel = require("../models/commitmentsModel");
const campainModel = require("../models/campaignModel");
const paymentModel = require("../models/paymentModel");
const People = require("../models/peopleModel");
const pettyCash = require("../models/pettyCashModel");
const AppError = require("../utils/AppError");

const {
  recordNewCommitmentOperation,
  recordNewPaymentOperation,
  recordDeleteOperation,
  recordEditOperation,
} = require("../utils/RecordOperation");
const { set } = require("mongoose");

const validateCommitmentFields = (commitment) => {
      if(!commitment.AmountPaid)
        commitment.AmountPaid = 0;
      if(!commitment.AmountRemaining)
        commitment.AmountRemaining = commitment.CommitmentAmount;
      if(!commitment.PaymentsMade)
        commitment.PaymentsMade = 0;
      if(!commitment.PaymentsRemaining)
        commitment.PaymentsRemaining = commitment.NumberOfPayments;
      if (commitment.CommitmentAmount <= 0)
        return"סכום התחייבות שנותר לא תקין";
      if (commitment.NumberOfPayments <= 0)
        return "מספר התשלומים שנותרו לא תקין";
      if (commitment.AmountRemaining < 0) 
        return 'סכום שנותר לתשלום אינו יכול להיות שלילי.'
      if (commitment.PaymentsRemaining < 0) 
        return 'סכום שנותר לתשלומים אינו יכול להיות שלילי.'
      if (commitment.CommitmentAmount < commitment.AmountPaid)
        return "סכום התחייבות לא יכול להיות קטן מסכום התחייבות שנותר.";
      if (commitment.NumberOfPayments < commitment.PaymentsMade)
        return "מספר התשלומים לא יכול להיות קטן ממספר התשלומים שנותרו.";
      if( commitment.CommitmentAmount - commitment.AmountPaid != commitment.AmountRemaining)
        return " סכום שנותר לתשלום לא תקין";
      if(commitment.NumberOfPayments-commitment.PaymentsMade != commitment.PaymentsRemaining)
        return " מספר התשלומים שנותרו לא תקין";
    
      return null;
    };




  
  
    exports.reviewCommitments = asyncHandler(async (req, res, next) => {
      let commitments = Array.isArray(req.body) ? req.body : [req.body];
      const {campainName} = req.query;
      const invalidCommitments = [];
      let validCommitments = [];
    
      const activePeople = await People.find({ isActive: true });
      const activePeopleMap = new Map(
        activePeople.map((person) => [person.AnashIdentifier, person])
      );
    
      // Filter out and enrich valid commitments
      const enrichedCommitments = commitments.map((commitment) => {
        if (!commitment.AnashIdentifier) {
          return { ...commitment, reason: "מזהה אנש לא סופק" };
        }
        commitment.AnashIdentifier = String(commitment.AnashIdentifier);
    
        const person = activePeopleMap.get(commitment.AnashIdentifier);
    
        if (!person) {
          return { ...commitment, reason: "מזהה אנש לא קיים במערכת או לא פעיל" };
        }
    
        commitment.FirstName = person.FirstName || commitment.FirstName;
        commitment.LastName = person.LastName || commitment.LastName;
        commitment.PersonID = person.PersonID || commitment.PersonID;
    
        if (!commitment.CampainName && !campainName) {
          return { ...commitment, reason: "שם קמפיין לא סופק" };
        }
        if(campainName && commitment.CampainName && commitment.CampainName !== campainName){
          return { ...commitment, reason: "שם קמפיין לא תואם לדף הקמפיין" };
        }
        if (!commitment.CommitmentAmount || commitment.CommitmentAmount <= 0)
          return { ...commitment, reason: "סכום התחייבות לא תקין" };
        if (!commitment.NumberOfPayments || commitment.NumberOfPayments <= 0)
          return { ...commitment, reason: "מספר התשלומים לא תקין" };
    
        return commitment;
      });
    
      const filteredCommitments = enrichedCommitments.filter((commitment) => {
        if (commitment.reason) {
          invalidCommitments.push(commitment);
          return false;
        }
        return true;
      });
    
      const uniqueCampaignNames = [
        ...new Set(filteredCommitments.map((c) => c.CampainName)),
      ];
      const allCampaigns = await campainModel.find({
        CampainName: { $in: uniqueCampaignNames },
      });
      const campaignMap = new Map(
        allCampaigns.map((campaign) => [campaign.CampainName, campaign])
      );
    
      const allExistingCommitments = await commitmentsModel.find({
        AnashIdentifier: { $in: filteredCommitments.map((c) => c.AnashIdentifier) },
        CampainName: { $in: uniqueCampaignNames },
      });
    
      const seenCommitments = new Set();
    
      for (const commitment of filteredCommitments) {
        const campaign = campaignMap.get(commitment.CampainName);
        if (!campaign) {
          invalidCommitments.push({
            ...commitment,
            reason: "קמפיין לא קיים במערכת",
          });
          continue;
        }
    
        const isExisting = allExistingCommitments.some(
          (existing) =>
            existing.AnashIdentifier === commitment.AnashIdentifier &&
            existing.CampainName === commitment.CampainName
        );
    
        if (isExisting) {
          invalidCommitments.push({
            ...commitment,
            reason: "התחייבות כבר קיימת במערכת",
          });
          continue;
        }
    
        const fieldError = validateCommitmentFields(commitment);
        if (fieldError !== null) {
          invalidCommitments.push({ ...commitment, reason: fieldError });
          continue;
        }
    
        // Create a unique key for `AnashIdentifier` and `CampainName`
        const uniqueKey = `${commitment.AnashIdentifier}-${commitment.CampainName}`;
    
        if (seenCommitments.has(uniqueKey)) {
          invalidCommitments.push({
            ...commitment,
            reason: "התחייבות כפולה עם אותו אנש ואותו שם קמפיין",
          });
          continue;
        }
    
        seenCommitments.add(uniqueKey);
        validCommitments.push(commitment);
      }
    
      res.status(200).json({
        status: "success",
        validCommitments,
        invalidCommitments,
      });
    });
    exports.updateCommitmentDetails = asyncHandler(async (req, res, next) => {
      const commitment = req.body;
      const exsitCommitment = await commitmentsModel.findById(commitment._id);
      if (!exsitCommitment)
        return next(new AppError( 400,"התחייבות לא נמצאה"));
      if (!commitment.CommitmentAmount || commitment.CommitmentAmount <= 0)
        return next(new AppError(400,"סכום התחייבות לא תקין"));
      if (!commitment.NumberOfPayments || commitment.NumberOfPayments <= 0)
        return next(new AppError(400,"מספר התשלומים לא תקין"));

        
      
      const fieldError = validateCommitmentFields(commitment);

      if (fieldError !== null) {
        return next(new AppError(400,fieldError));
      }
      const updatedCommitment = await commitmentsModel.findOneAndUpdate(
        { AnashIdentifier: commitment.AnashIdentifier },
        { $set: commitment },
        { new: true }
      );
      if (!updatedCommitment)
        return next(new AppError(404,"התחייבות לא נמצאה"));
      res.status(200).json({
        status: "success",
        updatedCommitment,
      });
    })

  
      
      
  
    




  exports.uploadCommitments = asyncHandler(async (req, res, next) => {
    const commitments = Array.isArray(req.body) ? req.body : [req.body];
    // console.log(commitments);
    const uploadedCommitments = await commitmentsModel.insertMany(commitments);
  
    if (uploadedCommitments?.length === 0) {
      console.log("Commitments not uploaded");
      return next(new AppError("Commitments not uploaded", 404));
    }
  
  
    res.status(200).json({
      status: "success",
      
      uploadedCommitments,
      
    });
  })

  function validatePaymentFields(paymentAmount,commitment) {

    const updatedAmountPaid = (commitment.AmountPaid || 0) + paymentAmount;
    const updatedAmountRemaining = (commitment.CommitmentAmount || 0) - updatedAmountPaid;
    const updatedPaymentsMade = (commitment.PaymentsMade || 0) + 1;
    const updatedPaymentsRemaining = (commitment.PaymentsRemaining || 0) - 1;
    console.log(updatedAmountPaid);
  
    if (updatedAmountPaid > commitment.CommitmentAmount) {
      return "סכום התשלום חורג מסכום ההתחייבות";
    }
    if (updatedAmountRemaining < 0) {
      return'סכום התשלום גדול מהסכום שנותר לתשלום';
    }
    if (updatedAmountRemaining > commitment.CommitmentAmount) {
      return'הסכום שנותר לתשלום לא יכול לחרוג מסכום ההתחייבות';
    }
    if (updatedPaymentsMade > commitment.NumberOfPayments) {
      return'מספר התשלומים בפועל לא יכול לעלות על מספר התשלומים הכולל';
    }
    if (updatedPaymentsRemaining < 0) {
      return 'מספר התשלומים הנותרים לא יכול להיות פחות מאפס';
    }
    if (updatedPaymentsRemaining > commitment.NumberOfPayments) {
      return 'מספר התשלומים שנותרו גדול מסך התשלומים';
    }
  
    
  }
  
  
      
  
  exports.reviewCommitmentPayments = async (req, res, next) => {
    //multipul payments
    const paymentsData = Array.isArray(req.body) ? req.body : [req.body];
    const validPayments = [];
    const invalidPayments = [];
    const activePeople = await People.find({ isActive: true });
    const activePeopleMap = new Map(
      activePeople.map((person) => [person.AnashIdentifier, person])
      
    );
  
    const enrichedPayments = paymentsData.map((payment) => {
      if (!payment.AnashIdentifier) {
        return { ...payment, reason: " מזהה אנש לא סופק" };
      }
      payment.AnashIdentifier = String(payment.AnashIdentifier);
      
      const person = activePeopleMap.get(payment.AnashIdentifier);
      
      if (!person) {
        return { ...payment, reason: " מזהה אנש לא קיים במערכת או לא פעיל " };
      }
      if (!payment.CampainName) {
        return { ...payment, reason: "שם קמפיין לא סופק" };
      }
  
  
      if (!payment.Amount || payment.Amount <= 0)
        return { ...payment, reason: "סכום התשלום לא תקין" };
        
      
  
      payment.FirstName = person.FirstName|| payment.FirstName;
      payment.LastName = person.LastName || payment.LastName;
  
  
      return payment;
    });
  
    const filteredPayments = enrichedPayments.filter((payment) => {
      if (payment.reason) {
        invalidPayments.push(payment);
        return false;
      }
      return true;
    });
    // const uniqueCampaignNames = [...new Set(filteredPayments.map(p => p.CampainName))];
    const allCampaigns = await campainModel.find();
    const campaignMap = new Map(allCampaigns.map((campaign) => [campaign.CampainName, campaign]));
    const commitments =  await commitmentsModel.find();
  
  
  
    for (const payment of filteredPayments) {
      const campaign = campaignMap.get(payment.CampainName);
      if (!campaign) {
        invalidPayments.push({
          ...payment,
          reason: "שם קמפיין לא קיים במערכת",});
        continue;
      }
      const commitment = getCommitmentOfPayment(payment,commitments);
      if(!commitment)
      {
        invalidPayments.push({
          ...payment,
          reason: "התחייבות לא קיימת במערכת",});
        continue;
      }
      const fieldError = validatePaymentFields(payment.Amount,commitment);
      if (fieldError) {
        invalidPayments.push({
          ...payment,
          reason: fieldError,
        });
        continue;
      }
      validPayments.push(payment);
    }
    res.status(200).json({
      status: "success",
      validPayments,
      invalidPayments,
    });
  }

  exports.uploadPayments = asyncHandler(async (req, res, next) => {
    const payments = Array.isArray(req.body) ? req.body : [req.body];
    
    // Get all unique commitment IDs from the payments
    const commitmentIds = [...new Set(payments.map(payment => payment.CommitmentId))];
    
    // Fetch all relevant commitments in a single query
    const commitments = await commitmentsModel.find({
      _id: { $in: commitmentIds }
    });
    
    // Create a map for faster commitment lookup
    const commitmentMap = new Map(
      commitments.map(commitment => [commitment._id.toString(), commitment])
    );
  
    // Prepare commitments to update and valid payments to insert
    const commitmentsToUpdate = new Map();
    const validPayments = [];
    
    for (const payment of payments) {
      const commitment = commitmentMap.get(payment.CommitmentId.toString());
      
      if (commitment) {
        // Prepare payment for insertion
        payment.CommitmentId = commitment._id;
        validPayments.push(payment);
  
        // Aggregate updates for each commitment
        if (!commitmentsToUpdate.has(commitment._id.toString())) {
          commitmentsToUpdate.set(commitment._id.toString(), {
            _id: commitment._id,
            PaymentsRemaining: commitment.PaymentsRemaining,
            AmountRemaining: commitment.AmountRemaining,
            AmountPaid: commitment.AmountPaid,
            PaymentsMade: commitment.PaymentsMade
          });
        }
  
        const updateData = commitmentsToUpdate.get(commitment._id.toString());
        updateData.PaymentsRemaining -= 1;
        updateData.AmountRemaining -= payment.Amount;
        updateData.AmountPaid += payment.Amount;
        updateData.PaymentsMade += 1;
      }
    }
    
    // If no valid payments, return an error
    if (validPayments.length === 0) {
      return next(new AppError("No valid payments to upload", 404));
    }
    
    // Prepare bulk updates for commitments
    const bulkUpdates = Array.from(commitmentsToUpdate.values()).map(updateData => ({
      updateOne: {
        filter: { _id: updateData._id },
        update: {
          $set: {
            PaymentsRemaining: updateData.PaymentsRemaining,
            AmountRemaining: updateData.AmountRemaining,
            AmountPaid: updateData.AmountPaid,
            PaymentsMade: updateData.PaymentsMade
          }
        }
      }
    }));
    
    // Execute bulk insert for payments and bulk update for commitments in parallel
    await Promise.all([
      paymentModel.insertMany(validPayments),       // Bulk insert all payments
      commitmentsModel.bulkWrite(bulkUpdates)       // Bulk update all commitments
    ]);
  
    res.status(200).json({
      status: "success",
    });
  });

  exports.uploadCommitmentPayment = asyncHandler(async (req, res, next) => {
    const payment = req.body;
    console.log(payment);
    if(!payment)
    {
      return next(new AppError(400,'לא נשלח תשלום'));
    }
    const commitment = await commitmentsModel.findOne({AnashIdentifier:payment.AnashIdentifier,CampainName:payment.CampainName});
    if (!commitment) {
      return next(new AppError(400,'התחייבות לא קיימת במערכת'));
    }
    payment.CommitmentId = commitment._id
    const fieldError = validatePaymentFields(payment.Amount,commitment);
    if (fieldError) {
      return next(new AppError(400,fieldError));
    }
    const newPayment = await paymentModel.create(payment);
    commitment.AmountPaid = commitment.AmountPaid + parseFloat(payment.Amount);
    commitment.AmountRemaining = commitment.AmountRemaining - parseFloat(payment.Amount);
    commitment.PaymentsMade = commitment.PaymentsMade + 1;
    commitment.PaymentsRemaining = commitment.PaymentsRemaining - 1;
    const updatedCommitment = await commitment.save();
    res.status(200).json({
      status: "success",
      newPayment,
      updatedCommitment,
      
    });
  })
  exports.deletePayment = asyncHandler(async (req, res, next) => {
    const paymentId = req.params.paymentId;
  
    const payment = await paymentModel.findById(paymentId);
    if (!payment) {
      return next(new AppError(404,' לא נמצא תשלום במערכת'));
    }
  
    const commitmentId = payment.CommitmentId;
  
    // מחק את התשלום
    const commitment = await commitmentsModel.findById(commitmentId);
    if (!commitment) {
      return next(new AppError("Commitment not found", 404));
    }
    const deletedPayment = await paymentModel.findByIdAndDelete(paymentId);
  
  
    // עדכן את ההתחייבות
    commitment.AmountPaid = commitment.AmountPaid - parseFloat(payment.Amount);
    commitment.AmountRemaining =
      commitment.AmountRemaining + parseFloat(payment.Amount);
    commitment.PaymentsMade = commitment.PaymentsMade - 1;
    commitment.PaymentsRemaining = commitment.PaymentsRemaining + 1;
  
    const updatedCommitment = await commitment.save();
    // if (deletedPayment) {
    //   const recordOperation = recordDeleteOperation({
    //     Date: new Date(),
    //     OperationType: "מחיקת תשלום",
    //     UserFullName: req.user.fullName,
    //     OldValue: `${deletedPayment.Amount} ש"ח`,
    //   });
    //   if (recordOperation) {
    //     user.Operations.push(recordOperation);
    //     const updatedUser = await user.save();
    //   }
    // }
  
    res.status(200).json({
      status: "success",
      deletedPayment,
      updatedCommitment,
      
    });
  });


    
// פונקציה לתרגום שגיאות לעברית
function translateErrorToHebrew(errorMessage) {
  if (errorMessage.includes('מזהה אנ"ש לא קיים במערכת')) {
    return 'מזהה אנ"ש לא קיים במערכת';
  }
  if (errorMessage.includes("PaymentMethod")) {
    return "אמצעי תשלום לא תקין";
  }
  return "שגיאה לא ידועה";
}

exports.getCommitment = asyncHandler(async (req, res, next) => {
  const commitment = await commitmentsModel.find();
  // select('AnashIdentifier PersonID FirstName LastName CommitmentAmount AmountPaid AmountRemaining NumberOfPayments PaymentsMade PaymentsRemaining Fundraiser PaymentMethod Notes ResponseToFundraiser');
  res.status(200).json({
    status: "success",
    data: {
      commitment,
    },
  });
});

exports.getCommitmentsByCampaign = asyncHandler(async (req, res, next) => {
  const { campainName } = req.query;

  const filter = campainName ? { CampainName: campainName } : {};

  const commitments = await commitmentsModel
    .find(filter)
    .select(
      "AnashIdentifier PersonID FirstName LastName CommitmentAmount AmountPaid AmountRemaining NumberOfPayments PaymentsMade PaymentsRemaining Fundraiser PaymentMethod Notes ResponseToFundraiser"
    );
    // console.log(commitments);

  res.status(200).json({
    status: "success",
    data: {
      commitments: commitments,
    },
  });
});

exports.getcommitmentbyanashandcampaign = async (req, res, next) => {
  const { AnashIdentifier, CampainName } = req.query;

  try {
    const commitment = await commitmentsModel.findOne({
      AnashIdentifier: AnashIdentifier,
      CampainName: CampainName,
    });
    if (commitment) {
      res.json(commitment);
    } else {
      return res.status(404).json({ message: "התחייבות לא נמצאה" }); // Explicitly return 404 for not found
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
function getCommitmentOfPayment(payment,commitments)
{
  const matchingCommitment = commitments.find(
    commitment => commitment.AnashIdentifier === payment.AnashIdentifier && commitment.CampainName === payment.CampainName
  );
  if(matchingCommitment)
  {
    payment.CommitmentId = matchingCommitment._id
  }
  
  return matchingCommitment;
  }





    







  



// exports.uploadCommitmentPayment = async (req, res, next) => {
//   const paymentsData = req.body;

//   const AnashIdentifier = paymentsData.AnashIdentifier;
//   if (!AnashIdentifier) {
//     return res.status(404).json({ message: 'מזהה אנ"ש לא סופק' }); // Explicitly return 404 for not found
//   }

//   const person = await People.findOne({ AnashIdentifier });
//   if (!person) {
//     return res
//       .status(404)
//       .json({ message: `מזהה אנ"ש ${AnashIdentifier} לא קיים במערכת` }); // Explicitly return 404 for not found
//   }
//   let commitment = null;
//   try {
//     const commitmentId = paymentsData.CommitmentId;
//     commitment = await commitmentsModel.findById(commitmentId);
//     if (!commitment) {
//       return res.status(404).json({ message: "התחייבות לא נמצאה" }); // Explicitly return 404 for not found
//     }
//     commitment.AmountPaid =
//       commitment.AmountPaid + parseFloat(paymentsData.Amount);
//     commitment.AmountRemaining =
//       commitment.AmountRemaining - parseFloat(paymentsData.Amount);
//     commitment.PaymentsMade = commitment.PaymentsMade + 1;
//     commitment.PaymentsRemaining = commitment.PaymentsRemaining - 1;
//     const updatedCommitment = await commitment.save();
//   } catch (error) {
//     return res.status(500).json({ message: "שגיאה בעדכון התחייבות" });
//   }
//   try {
//     const payment = await paymentModel.create(paymentsData);
//     if (payment) {
//       if (payment.PaymentMethod == "מזומן") {
//         const fullName = `${commitment.FirstName} ${commitment.LastName}`;
//         const { Amount, AnashIdentifier, Date } = payment;
//         const Type = "הכנסה";
//         const Transaction = {
//           FullNameOrReasonForIssue: fullName,
//           AnashIdentifier: AnashIdentifier,
//           Amount: Amount,
//           TransactionDate: Date,
//           TransactionType: Type,
//         };
//         const CreatedTransaction = await pettyCash.create(Transaction);
//       }
//       const recordOperation = recordNewPaymentOperation({
//         Date: new Date(),
//         OperationType: "הוספת תשלום",
//         UserFullName: req.user.FullName,
//         NewValue: `תשלום באמצעות: ${paymentsData.PaymentMethod} סכום תשלום: ${paymentsData.Amount} ש"ח`,
//       });
//       if (recordOperation) {
//         person.Operations.push(recordOperation);
//         const updatedPerson = await person.save();
//       }
//       return res.status(200).json({
//         message: "התשלום נוסף בהצלחה",
//       });
//     }
//   } catch (error) {
//     const commitmentId = paymentsData.CommitmentId;
//     const commitment = await commitmentsModel.findById(commitmentId);
//     if (!commitment) {
//       return res.status(404).json({ message: "התחייבות לא נמצאה" }); // Explicitly return 404 for not found
//     }
//     commitment.AmountPaid =
//       commitment.AmountPaid - parseFloat(paymentsData.Amount);
//     commitment.AmountRemaining =
//       commitment.AmountRemaining + parseFloat(paymentsData.Amount);
//     commitment.PaymentsMade = commitment.PaymentsMade - 1;
//     commitment.PaymentsRemaining = commitment.PaymentsRemaining + 1;
//     const updatedCommitment = await commitment.save();

//     return res.status(404).json({ message: error.message }); // Explicitly return 404 for not found
//   }
// };

exports.getCommitmentById = asyncHandler(async (req, res, next) => {
  const commitmentId = req.params._id;
  const commitment = await commitmentsModel.findById(commitmentId);
  const payments = await getCommitmentPayments(commitmentId);
  if (!commitment) {
    return next(new AppError("User not found", 404));
  }
  
  else {
    res.status(200).json({
      status: "success",
      data: {
        commitment,
        payments,
      },
    });
  }
});
async function getCommitmentPayments(commitmentId)
 {
  try{
    const payments = await paymentModel.find({ CommitmentId: commitmentId });
    return payments;
  }
  catch(err)
  {
    return null;
  }

 }
 exports.deleteCommitment = asyncHandler(async (req, res, next) => {
  const commitmentId = req.params.commitmentId;

  // Delete commitment
  const deletedCommitment = await commitmentsModel.findByIdAndDelete(commitmentId);
  if (!deletedCommitment) {
    return next(new AppError(400, "התחייבות לא נמצאה"));
  }

  // Delete payments related to the commitment
  const deletedPayments = await paymentModel.deleteMany({
    CommitmentId: commitmentId,
  });

  // Find user for logging purposes
  const user = await People.findOne({
    AnashIdentifier: deletedCommitment.AnashIdentifier,
  });

  if (user) {
    try {
      // Prepare record operation
      const recordOperation = recordDeleteOperation({
        Date: new Date(),
        OperationType: "מחיקת התחייבות",
        UserFullName: req.user.FullName,
        OldValue: `commitment amount ${deletedCommitment.CommitmentAmount}`,
      });

      if (deletedPayments?.deletedCount > 0) {
        recordOperation.OldValue += ` מספר תשלומים שנמחקו: ${deletedPayments.deletedCount} בסך כולל של סכום: ${deletedPayments.AmountPaid || 0} ש"ח`;
      }

      // Save operation record to user
      user.Operations.push(recordOperation);
      await user.save();
    } catch (error) {
      console.error("Failed to record operation:", error.message);
      // Optionally log this to an external monitoring service
    }
  }

  // Respond with success
  res.status(200).json({
    status: "success",
    message: "Commitment and related payments deleted successfully.",
  });
});



// exports.updateCommitmentDetails = asyncHandler(async (req, res, next) => {
//   const { commitmentId } = req.params;
//   const updatedDetails = req.body;

//   try {
//     const oldCommitmentDetails = await commitmentsModel.findById(commitmentId);
//     if (!oldCommitmentDetails) {
//       return next(new AppError("Commitment not found", 404));
//     }

//     const updatedCommitmentDetails = await commitmentsModel.findOneAndUpdate(
//       { _id: commitmentId },
//       { $set: updatedDetails }, // Only update the fields provided in req.body
//       {
//         new: true, // Return the updated document
//         runValidators: true, // Ensure schema validation is applied
//       }
//     );

//     if (!updatedCommitmentDetails) {
//       return next(new AppError("cannot update", 404));
//     } else {
//       const user = await People.findOne({
//         AnashIdentifier: updatedCommitmentDetails.AnashIdentifier,
//       });
//       if (user) {
//         const recordOperation = recordEditOperation({
//           Date: new Date(),
//           OperationType: "עדכון פרטי התחייבות",
//           UserFullName: req.user.FullName,
//           OldValue: oldCommitmentDetails,
//           NewValue: updatedCommitmentDetails,
//         });
//         if (recordOperation) {
//           user.Operations.push(recordOperation);
//           const updatedUser = await user.save();
//         }
//       }
//     }

//     res.status(200).json({
//       status: "success",
//       data: {
//         updateCommitmentDetails: updatedCommitmentDetails,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// });

exports.AddMemorialDayToPerson = asyncHandler(async (req, res, next) => {
  const { AnashIdentifier, CampainName, MemorialDay } = req.body;
  const commitment = await commitmentsModel.findOne({
    AnashIdentifier: AnashIdentifier,
    CampainName: CampainName,
  });
  if (!commitment) {
    return next(new AppError("Commitment not found", 404));
  }
  const campain = await campainModel.findOne({ CampainName: CampainName });
  if (!campain) {
    return next(new AppError("Campain not found", 404));
  }
  const isEnoughMoney =
    Math.floor(
      commitment.CommitmentAmount / campain.minimumAmountForMemorialDay
    ) - commitment.MemorialDays.length;
  if (isEnoughMoney <= 0) {
    return next(new AppError("Not enough money", 404));
  }
  const existingMemorialDayIndex = commitment.MemorialDays.findIndex((md) =>
    isTheSameDate(new Date(md.date), new Date(MemorialDay.date))
  );
  if (existingMemorialDayIndex !== -1) {
    // If the date exists, override it
    commitment.MemorialDays[existingMemorialDayIndex] = MemorialDay;
  } else {
    // If the date does not exist, add it to the array
    commitment.MemorialDays.push(MemorialDay);
  }

  const updatedCommitment = await commitment.save();

  res.status(200).json({
    status: "success",
    data: {
      updatedCommitment,
    },
  });
});

exports.GetEligblePeopleToMemmorialDay = asyncHandler(
  async (req, res, next) => {
    const { campainName } = req.params;
    const campain = await campainModel.findOne({ CampainName: campainName });
    if (!campain) {
      return next(new AppError("Campain not found", 404));
    }
    const commitments = await commitmentsModel
      .find({ CampainName: campainName })
      .populate("person");

    if (!commitments || commitments.length === 0) {
      return next(new AppError("Commitments not found", 404));
    }
    let people = [];

    commitments.forEach((commitment) => {
      const remainingMemorialDays =
        Math.floor(
          commitment.CommitmentAmount / campain.minimumAmountForMemorialDay
        ) - commitment.MemorialDays.length;
      // If the remainingMemorialDays is enough, add the person associated with the commitment
      if (remainingMemorialDays > 0) {
        people.push(commitment.person); // This is the person associated with the commitment
      }
    });

    res.status(200).json({
      status: "success",
      data: {
        people,
      },
    });
  }
);

exports.DeleteMemorialDay = asyncHandler(async (req, res, next) => {
  const { AnashIdentifier, CampainName, date } = req.query;
  const commitment = await commitmentsModel.findOne({
    AnashIdentifier: AnashIdentifier,
    CampainName: CampainName,
  });
  if (!commitment) {
    return next(new AppError("Commitment not found", 404));
  }
  let updatedMemorialDays = commitment.MemorialDays;
  updatedMemorialDays = commitment.MemorialDays.filter((day) => {
    return !isTheSameDate(new Date(day.date), new Date(date));
  });

  if (updatedMemorialDays.length === commitment.MemorialDays.length) {
    return next(new AppError("Date not found", 404));
  }
  commitment.MemorialDays = updatedMemorialDays;
  const updatedCommitment = await commitment.save();
  res.status(200).json({
    status: "success",
    data: {
      updatedCommitment,
    },
  });
});
function isTheSameDate(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
