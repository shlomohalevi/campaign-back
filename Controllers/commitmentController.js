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

const validateCommitmentFields = (commitment,isUpdate) => {
  // Convert to numbers to avoid issues with string-based inputs
  commitment.CommitmentAmount = Number(commitment.CommitmentAmount);
  commitment.AmountPaid = Number(commitment.AmountPaid ?? 0);  // Default to 0 if falsy
  commitment.PaymentsMade = Number(commitment.PaymentsMade ?? 0);  // Default to 0 if falsy
  commitment.NumberOfPayments = Number(commitment.NumberOfPayments);
  if(isUpdate){
  commitment.AmountRemaining = Number(commitment.AmountRemaining ?? commitment.CommitmentAmount);  // Default to CommitmentAmount if falsy
  commitment.PaymentsRemaining = Number(commitment.PaymentsRemaining ?? commitment.NumberOfPayments);  // Default to NumberOfPayments if falsy
}
else{
    commitment.AmountRemaining = Number(commitment.AmountRemaining || commitment.CommitmentAmount);  // Default to CommitmentAmount if falsy
    commitment.PaymentsRemaining = Number(commitment.PaymentsRemaining || commitment.NumberOfPayments);  // Default to NumberOfPayments if falsy

  }

  // Check for invalid CommitmentAmount or NumberOfPayments
  if (commitment.CommitmentAmount <= 0) {
    return "סכום התחייבות שנותר לא תקין";
  }
  if (commitment.NumberOfPayments && commitment.NumberOfPayments <= 0) {
    return "מספר התשלומים לא תקין";
  }
  
  // Check for negative AmountRemaining or PaymentsRemaining
  if (commitment.AmountRemaining < 0) {
    return 'סכום שנותר לתשלום אינו יכול להיות שלילי.';
  }
  if (commitment.PaymentsRemaining < 0) {
    return 'סכום שנותר לתשלומים אינו יכול להיות שלילי.';
  }

  // Check if CommitmentAmount is not less than AmountPaid
  if (commitment.CommitmentAmount < commitment.AmountPaid) {
    return "סכום התחייבות לא יכול להיות קטן מסכום התחייבות שנותר.";
  }

  // Check if NumberOfPayments is not less than PaymentsMade
  if (commitment.NumberOfPayments && commitment.NumberOfPayments < commitment.PaymentsMade) {
    return "מספר התשלומים לא יכול להיות קטן ממספר התשלומים שנותרו.";
  }

  // Check if the remaining amount matches the difference between CommitmentAmount and AmountPaid
  if (commitment.CommitmentAmount - commitment.AmountPaid != commitment.AmountRemaining) {
    return " סכום שנותר לתשלום לא תקין";
  }

  // Check if the remaining payments match the difference between NumberOfPayments and PaymentsMade
  if (commitment.NumberOfPayments && commitment.NumberOfPayments - commitment.PaymentsMade != commitment.PaymentsRemaining) {
    return " מספר התשלומים שנותרו לא תקין";
  }

  return null;  // Return null if all validations pass
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
    
        const isExisting = allExistingCommitments.some((existing) => {
        
          // Directly return the result of the condition
          return existing.AnashIdentifier === commitment.AnashIdentifier &&
                 existing.CampainName === commitment.CampainName;
        });
            
        if (isExisting) {
          invalidCommitments.push({
            ...commitment,
            reason: "התחייבות כבר קיימת במערכת",
          });
          continue;
        }
    
        const fieldError = validateCommitmentFields(commitment,false);
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
      const person = await People.findOne({
        AnashIdentifier: commitment.AnashIdentifier,
        isActive: true,
      })
      if (!person)
        return next(new AppError(400,"מזהה אנש לא קיים במערכת או לא פעיל"));
      const exsitCommitment = await commitmentsModel.findById(commitment._id);
      if (!exsitCommitment)
        return next(new AppError( 400,"התחייבות לא נמצאה"));


      if (!commitment.CommitmentAmount || commitment.CommitmentAmount <= 0)
        return next(new AppError(400,"סכום התחייבות לא תקין"));

      const campain = await campainModel.findOne({ CampainName: commitment.CampainName });
      if (!campain)
        return next(new AppError(400," קמפיין לא זוהה"));
      const amountPerMemorialDay = campain.minimumAmountForMemorialDay;
      if (commitment.CommitmentAmount < (amountPerMemorialDay * commitment.MemorialDays.length))
        return next(new AppError(400,"סכום ההתחייבות אינו מספיק למספר ימי ההנצחה"));

      

        
      
      const fieldError = validateCommitmentFields(commitment,true);

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
    const anashIdentifiers = uploadedCommitments.map(commitment => commitment.AnashIdentifier);

    // Find all the people with matching AnashIdentifiers (this avoids `find` for each commitment)
    const people = await People.find({ AnashIdentifier: { $in: anashIdentifiers } });

    // Prepare the bulk updates for people who need to update their campaigns array
    const bulkUpdates = [];

    for (const commitment of uploadedCommitments) {
      const { AnashIdentifier, CampainName } = commitment;

      const person = people.find(p => p.AnashIdentifier === AnashIdentifier);

      if (person && !person.Campaigns.includes(CampainName)) {
        // Add an update operation to the bulkUpdates array
        bulkUpdates.push({
          updateOne: {
            filter: { AnashIdentifier },
            update: { $push: { Campaigns: CampainName } }
          }
        });
      }
    }

    // Execute all the updates in a single batch operation
    if (bulkUpdates.length > 0) {
      await People.bulkWrite(bulkUpdates);
    }
    
  
  
    res.status(200).json({
      status: "success",
      
      uploadedCommitments,
      
    });
  })

  function validatePaymentFields(paymentAmount, commitment) {
    // Convert fields to numbers (in case they are strings or undefined)
    const amountPaid = Number(commitment.AmountPaid ?? 0); 
    const commitmentAmount = Number(commitment.CommitmentAmount ?? 0);
    const paymentsMade = Number(commitment.PaymentsMade ?? 0);
    const paymentsRemaining = Number(commitment.PaymentsRemaining ?? 0);
    const numberOfPayments = Number(commitment.NumberOfPayments ?? 0);
  
    // Updated values
    const updatedAmountPaid = amountPaid + paymentAmount;
    const updatedAmountRemaining = commitmentAmount - updatedAmountPaid;
    const updatedPaymentsMade = paymentsMade + 1;
    const updatedPaymentsRemaining = paymentsRemaining - 1;
  
    console.log(updatedAmountPaid);
  
    // Validation checks
    if (updatedAmountPaid > commitmentAmount) {
      return "סך התשלום חורג מסכום ההתחייבות";
    }
    if (updatedAmountRemaining < 0) {
      return 'סכום התשלום גדול מהסכום שנותר לתשלום';
    }
    if (updatedAmountRemaining > commitmentAmount) {
      return 'הסכום שנותר לתשלום לא יכול לחרוג מסכום ההתחייבות';
    }
    if (numberOfPayments&&updatedPaymentsMade > numberOfPayments) {
      return 'מספר התשלומים בפועל לא יכול לעלות על מספר התשלומים הכולל';
    }
    if (numberOfPayments&& updatedPaymentsRemaining < 0) {
      return 'מספר התשלומים הנותרים לא יכול להיות פחות מאפס';
    }
    if (numberOfPayments&& updatedPaymentsRemaining > numberOfPayments) {
      return 'מספר התשלומים שנותרו גדול מסך התשלומים';
    }
  
    return null;  // No errors, validation passed
  }
    
  
      
  
  exports.reviewCommitmentPayments = async (req, res, next) => {
    let paymentsData = Array.isArray(req.body.data)? req.body.data:[req.body.data];
    let campainName = req.body.campainName;
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
      if (!payment.CampainName&&!campainName) {
        console.log(payment.CampainName);
        return { ...payment, reason: "שם קמפיין לא סופק" };
      }
      payment.CampainName = payment.CampainName || campainName;
  
  
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
    console.log('1');

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
        console.log(commitmentsToUpdate);
        console.log('2');
  
        const updateData = commitmentsToUpdate.get(commitment._id.toString());
         updateData.PaymentsRemaining = updateData.numberOfPayments?  updateData.PaymentsRemaining - 1:updateData.PaymentsRemaining;
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
    const person = await People.findOne({AnashIdentifier:payment.AnashIdentifier,isActive:true});
    if(!person)
    {
      return next(new AppError(400,'מזהה אנש לא קיים במערכת או לא פעיל'));
    }
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
    commitment.PaymentsRemaining = commitment.numberOfPayments? commitment.PaymentsRemaining - 1: commitment.PaymentsRemaining;
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
    const person = await People.findOne({ AnashIdentifier: payment.AnashIdentifier, isActive: true });
    if (!person) {
      return next(new AppError(404,"מזהה אנש לא קיים במערכת או לא פעיל "));
    }
    
    const commitmentId = payment.CommitmentId;

  
    // מחק את התשלום
    const commitment = await commitmentsModel.findById(commitmentId);
    if (!commitment) {
      return next(new AppError("התחייבות לא קיימת במערכת  ", 404));
    }
    const deletedPayment = await paymentModel.findByIdAndDelete(paymentId);
  
  
    // עדכן את ההתחייבות
   commitment.AmountPaid? commitment.AmountPaid = commitment.AmountPaid - parseFloat(payment.Amount):commitment.AmountPaid;
   commitment.AmountRemaining? commitment.AmountRemaining = commitment.AmountRemaining + parseFloat(payment.Amount):commitment.AmountRemaining;

   commitment.PaymentsMade? commitment.PaymentsMade = commitment.PaymentsMade - 1:commitment.PaymentsMade;
   commitment.PaymentsRemaining? commitment.PaymentsRemaining = commitment.PaymentsRemaining + 1:commitment.PaymentsRemaining;
  
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
  // Fetch commitments and populate the AnashIdentifier field with a filter
  const commitments = await commitmentsModel.find()
  

  res.status(200).json({
    status: "success",
    data: {
      commitments,
    },
    
  });
})

exports.getCommitmentsByCampaign = asyncHandler(async (req, res, next) => {
  const { campainName, isActive } = req.query;
  console.log(req.query);
  console.log(campainName, isActive);

  // Step 1: Build filters for campaign and isActive
  const campainFilter = campainName ? { CampainName: campainName } : {};
  let isActiveFilter = {};

  if (isActive === "true") {
    isActiveFilter.isActive = true;
  } else if (isActive === "false") {
    isActiveFilter.isActive = false;
  }

  // Step 2: Retrieve the list of AnashIdentifiers based on the isActive filter
  let activePeople;
  if (isActive === "true" || isActive === "false") {
    activePeople = await People.find(isActiveFilter).select("AnashIdentifier");
  } else {
    // If no isActive filter, retrieve all AnashIdentifiers
    activePeople = await People.find().select("AnashIdentifier");
  }

  // Step 3: Get a list of AnashIdentifiers from the activePeople result
  const anashIdentifiers = activePeople.map(person => person.AnashIdentifier);

  // Step 4: Query commitments that match the AnashIdentifiers
  const commitments = await commitmentsModel
    .find({
      ...campainFilter,
      AnashIdentifier: { $in: anashIdentifiers } // Filter by AnashIdentifiers
    });

  // Step 5: Return the result
  res.status(200).json({
    status: "success",
    data: {
      commitments,
    },
  });
});

    
      
    
    
    
  // .select(
  //   "AnashIdentifier PersonID FirstName LastName CommitmentAmount AmountPaid AmountRemaining NumberOfPayments PaymentsMade PaymentsRemaining Fundraiser PaymentMethod Notes ResponseToFundraiser"
  // );

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
  const commitmentPayment = await paymentModel.find({ CommitmentId: commitmentId });

  if (commitmentPayment?.length > 0) {
    return next(new AppError(400, "לא ניתן למחוק התחייבות כי קיימים תשלומים בהתחייבות"));
  }

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
  //get all memorial days in this campain to check if there is day with the same date
  const campinCommitments = await commitmentsModel.find({
    CampainName: CampainName,
  })
  let commitmentWithTheSameDate = '';
  // console.log(otherCampainCommitments);
  const isMemorialDayAlreadySet = campinCommitments?.some(commitment => 
    commitment.MemorialDays?.some(memDay => 
    {
      if (isTheSameDate(new Date(memDay.date), new Date(MemorialDay.date))) {
        commitmentWithTheSameDate = commitment;
        return true;
      }
      return false;
    }
     
    )
  );

  if (isMemorialDayAlreadySet) {
    return next(new AppError(400,`יום הנצחה תפוס על ידי ${commitmentWithTheSameDate.FirstName} ${commitmentWithTheSameDate.LastName}` ));
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
