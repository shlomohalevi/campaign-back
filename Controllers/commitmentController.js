const asyncHandler = require('express-async-handler');
const commitmentsModel = require('../models/commitmentsModel');
const paymentModel = require('../models/paymentModel');
const People = require('../Models/peopleModel')
const AppError = require('../utils/AppError');


exports.uploadCommitment = asyncHandler(async (req, res, next) => {
        let data = req.body;

        if (!Array.isArray(data)) {
            data = [data];
        }

        let successfulUploads = 0;
        const failedUploads = [];

        for (const commitment of data) {

            try {
                // בדיקת קיום המזהה אנ"ש
                const person = await People.findOne({ AnashIdentifier: commitment.AnashIdentifier });

                if (!person) {
                    failedUploads.push({
                        AnashIdentifier: commitment.AnashIdentifier,
                        PersonID: commitment.PersonID,
                        FirstName: commitment.FirstName,
                        LastName: commitment.LastName,
                        reason: 'מזהה אנ"ש לא קיים במערכת',
                    });
                    continue;
                }

                // בדיקת קיום התחייבות באותו קמפיין
                const existingCommitment = await commitmentsModel.findOne({
                    AnashIdentifier: commitment.AnashIdentifier,
                    CampainName: commitment.CampainName
                });
                if (existingCommitment && existingCommitment.CampainName) {
                    failedUploads.push({
                        AnashIdentifier: commitment.AnashIdentifier,
                        PersonID: commitment.PersonID,
                        FirstName: commitment.FirstName,
                        LastName: commitment.LastName,
                        reason: `למזהה אנ"ש ${commitment.AnashIdentifier} כבר קיימת התחייבות בקמפיין ${commitment.CampainName}`,
                    });
                    continue;
                }
                
            } catch (error) {
                failedUploads.push({
                    AnashIdentifier: commitment.AnashIdentifier,
                    PersonID: commitment.PersonID,
                    FirstName: commitment.FirstName,
                    LastName: commitment.LastName,
                    reason: error.message,
                });
                continue;
            }
                // יצירת ההתחייבות
                try {
                    await commitmentsModel.create({ ...commitment });
                    successfulUploads += 1;
                } catch (error) {
                    
                    console.log(error);

                    failedUploads.push({
                        AnashIdentifier: commitment.AnashIdentifier,
                        PersonID: commitment.PersonID,
                        FirstName: commitment.FirstName,
                        LastName: commitment.LastName,
                        reason: translateErrorToHebrew(error.message),
                    });
                }
                continue;

        }


        res.status(200).json({
            status: 'success',
            successfulCommitments: successfulUploads,
            failedCommitments: failedUploads,
        });

    });


// פונקציה לתרגום שגיאות לעברית
function translateErrorToHebrew(errorMessage) {
    if (errorMessage.includes('מזהה אנ"ש לא קיים במערכת')) {
        return 'מזהה אנ"ש לא קיים במערכת';
    }
    if (errorMessage.includes('PaymentMethod')) {
        return 'אמצעי תשלום לא תקין';
    }
    return 'שגיאה לא ידועה';
}


exports.getCommitment = asyncHandler(async (req, res, next) => {
    const commitment = await commitmentsModel.find().
        select('AnashIdentifier PersonID FirstName LastName CommitmentAmount AmountPaid AmountRemaining NumberOfPayments PaymentsMade PaymentsRemaining Fundraiser PaymentMethod Notes ResponseToFundraiser');
    res.status(200).json({
        status: 'success',
        data: {
            commitment
        }
    })
})

exports.getcommitmentbyanashandcampaign = async (req, res, next) => {
    const { AnashIdentifier, CampainName } = req.query; 

    try {
        const commitment = await commitmentsModel.findOne({
            AnashIdentifier: AnashIdentifier,
            CampainName: CampainName
        });
        if (commitment) {
            res.json(commitment);
        } else {
          return  res.status(404).json({ message: 'התחייבות לא נמצאה' });  // Explicitly return 404 for not found
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




exports.uploadCommitmentPayment = async (req, res, next) => {
        // נבדוק אם הנתונים הם אובייקט יחיד או מערך
        const paymentsData = req.body;
        
        const AnashIdentifier = paymentsData.AnashIdentifier;
        if(!AnashIdentifier)
        {
            return  res.status(404).json({ message: 'מזהה אנ"ש לא סופק' });  // Explicitly return 404 for not found
        }

        const person = await People.findOne({ AnashIdentifier });
        if (!person) {
            return  res.status(404).json({ message: `מזהה אנ"ש ${AnashIdentifier} לא קיים במערכת` });  // Explicitly return 404 for not found
        }
        try {
            const commitmentId = paymentsData.CommitmentId;
            const commitment = await commitmentsModel.findById(commitmentId);
            if (!commitment) {
                return res.status(404).json({ message: 'התחייבות לא נמצאה' });  // Explicitly return 404 for not found
            }
            commitment.AmountPaid   = commitment.AmountPaid + parseFloat(paymentsData.Amount);
            commitment.AmountRemaining   = commitment.AmountRemaining - parseFloat(paymentsData.Amount);
            commitment.PaymentsMade  = commitment.PaymentsMade  + 1;
            commitment.PaymentsRemaining =commitment.PaymentsRemaining - 1;
            const updatedCommitment = await commitment.save();
            
        } catch (error) {
            return res.status(500).json({ message: 'שגיאה בעדכון התחייבות' });
        }
        try{
            
            const payment = await paymentModel.create(paymentsData);
            if(payment){
                return res.status(200).json({
                     message: 'התשלום נוסף בהצלחה' ,
        
                });
                // return  res.status(404).json({ message: 'לא ניתן להוסיף את התשלום' });  // Explicitly return 404 for not found
            }
        }
        catch(error){
            const commitmentId = paymentsData.CommitmentId;
            const commitment = await commitmentsModel.findById(commitmentId);
            if (!commitment) {
                return res.status(404).json({ message: 'התחייבות לא נמצאה' });  // Explicitly return 404 for not found
            }
            commitment.AmountPaid   = commitment.AmountPaid - parseFloat(paymentsData.Amount);
            commitment.AmountRemaining   = commitment.AmountRemaining + parseFloat(paymentsData.Amount);
            commitment.PaymentsMade  = commitment.PaymentsMade  - 1;
            commitment.PaymentsRemaining =commitment.PaymentsRemaining + 1;
            const updatedCommitment = await commitment.save();


            return  res.status(404).json({ message: error.message });  // Explicitly return 404 for not found
            
        }
            
    };
            
            
    exports.getCommitmentById = asyncHandler(async (req, res, next) => {
        const commitmentId = req.params._id;
        try {
            // בדיקה ראשונית עם תצוגה של התשלומים הקשורים ל-commitmentId
            const initialPaymentsCheck = await paymentModel.find({ commitmentId });
    
            // שאילתא עם Promise.all
            const [commitmentDetails, payments] = await Promise.all([
                commitmentsModel.findById(commitmentId),
                paymentModel.find({ CommitmentId: commitmentId }) // מחפש תשלומים על פי ה-commitmentId
            ]);
            if (!commitmentDetails) {
                return res.status(404).json({
                    status: 'fail',
                    message: 'Commitment not found'
                });
            }
    
            res.status(200).json({
                status: 'success',
                data: {
                    commitmentDetails,
                    payments
                }
            });
        } catch (error) {
            next(error);
        }
    });
    exports.deleteCommitment = asyncHandler(async (req, res, next) => {
        const commitmentId = req.params.commitmentId;
        const deletedUser = await commitmentsModel.findByIdAndDelete(commitmentId);
        if (!deletedUser) {
            return next(new AppError('User not found', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                // deletedUser
            }
        })
    
    })
    
    exports.updateCommitmentDetails = asyncHandler(async (req, res, next) => {
        // לוג של הנתונים המתקבלים מהבקשה
        console.log('Request params ID:', req.params.commitmentId);
        console.log('Request body:', req.body);
    
        const { commitmentId } = req.params;
        const updatedDetails = req.body;
    
        try {
            const updatedCommitmentDetails = await commitmentsModel.findOneAndUpdate(
                { _id: commitmentId },
                { $set: updatedDetails }, // Only update the fields provided in req.body
                {
                    new: true, // Return the updated document
                    runValidators: true, // Ensure schema validation is applied
                }
            );
    
            // לוג של התוצאה מהפונקציה findOneAndUpdate
            console.log('Updated commitment details:', updatedCommitmentDetails);
    
            if (!updatedCommitmentDetails) {
                return next(new AppError('Commitment not found', 404));
            }
    
            res.status(200).json({
                status: 'success',
                data: {
                    updateCommitmentDetails: updatedCommitmentDetails
                }
            });
        } catch (error) {
            // לוג של השגיאה במידה ויש
            console.error('Error updating commitment:', error);
            next(error); // להעביר את השגיאה לפונקציה הבאה בטיפול בשגיאות
        }
    });
            
        
        


