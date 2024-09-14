const asyncHandler = require('express-async-handler');
const commitmentsModel = require('../models/commitmentsModel');
const paymentModel = require('../models/paymentModel');
const People = require('../Models/peopleModel')
const AppError = require('../utils/AppError');


exports.uploadCommitment = asyncHandler(async (req, res, next) => {
    try {
        let data = req.body;

        if (!Array.isArray(data)) {
            data = [data];
        }

        let successfulUploads = 0;
        const failedUploads = [];

        for (const commitment of data) {
            console.log(commitment);

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
                if (existingCommitment) {
                    failedUploads.push({
                        AnashIdentifier: commitment.AnashIdentifier,
                        PersonID: commitment.PersonID,
                        FirstName: commitment.FirstName,
                        LastName: commitment.LastName,
                        reason: `למזהה אנ"ש ${commitment.AnashIdentifier} כבר קיימת התחייבות בקמפיין ${commitment.CampainName}`,
                    });
                    continue;
                }

                // יצירת ההתחייבות
                try {
                    await commitmentsModel.create({ ...commitment });
                    successfulUploads += 1;
                } catch (error) {


                    failedUploads.push({
                        AnashIdentifier: commitment.AnashIdentifier,
                        PersonID: commitment.PersonID,
                        FirstName: commitment.FirstName,
                        LastName: commitment.LastName,
                        reason: translateErrorToHebrew(error.message),
                    });
                }

            } catch (error) {
                failedUploads.push({
                    AnashIdentifier: commitment.AnashIdentifier,
                    PersonID: commitment.PersonID,
                    FirstName: commitment.FirstName,
                    LastName: commitment.LastName,
                    reason: error.message,
                });
            }
        }

        res.status(200).json({
            status: 'success',
            successfulCommitments: successfulUploads,
            failedCommitments: failedUploads,
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: 'שגיאה בהעלאת התחייבויות',
        });
    }
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
    console.log(req.query);
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

async function updateCommitmentAfterPayment(commitment, payment) {
    const updatedAmountPaid = commitment.AmountPaid + parseFloat(payment.Amount);
    const updatedAmountRemaining = commitment.AmountRemaining - payment.Amount;
    const updatedPaymentsMade = commitment.PaymentsMade + 1;
    const updatedPaymentsRemaining = commitment.PaymentsRemaining - 1;
    console.log(updatedAmountPaid, commitment.AmountPaid, payment.Amount);

    // בדיקות לתנאים חריגים
    if (updatedAmountPaid > commitment.CommitmentAmount) {
        return { success: false, message: 'סכום התשלום חורג מסכום ההתחייבות' };
    }
    if (updatedAmountRemaining < 0) {
        return { success: false, message: 'סכום התשלום גדול מהסכום שנותר לתשלום' };
    }
    if (updatedAmountRemaining > commitment.CommitmentAmount) {
        return { success: false, message: 'הסכום שנותר לתשלום לא יכול לחרוג מסכום ההתחייבות' };
    }
    if (updatedPaymentsRemaining < 0) {
        return { success: false, message: 'לא נותרו תשלומים בהתחייבות' };
    }
    if (updatedPaymentsRemaining > commitment.NumberOfPayments) {
        return { success: false, message: 'מספר התשלומים שנותרו גדול מסך התשלומים ' };
    }
    if (updatedPaymentsMade > commitment.NumberOfPayments) {
        return { success: false, message: 'מספר התשלומים חורג מסך התשלומים ' };
    }

    // ניסיון לעדכן את ההתחייבות
    try {
        const updatedCommitment = await commitmentsModel.updateOne(
            { _id: commitment._id },
            {
                AmountPaid: updatedAmountPaid,
                AmountRemaining: updatedAmountRemaining,
                PaymentsMade: updatedPaymentsMade,
                PaymentsRemaining: updatedPaymentsRemaining
            }
        );

        // החזרת ההתחייבות המעודכנת אם העדכון הצליח
        if (updatedCommitment.modifiedCount > 0) {
            return { success: true, data: updatedCommitment };
        } else {
            return { success: false, message: 'לא הצליח לעדכן את ההתחייבות' };
        }
    } catch (error) {
        return { success: false, message: 'שגיאה בעדכון ההתחייבות: ' + error.message };
    }
}


exports.uploadPayment = asyncHandler(async (req, res, next) => {
    const validPayments = []
    const invalidPayments = []
    try {
        // נבדוק אם הנתונים הם אובייקט יחיד או מערך
        const paymentsData = Array.isArray(req.body) ? req.body : [req.body];

        // בדיקת מזהה אנ"ש עבור כל תשלום
        for (const payment of paymentsData) {
            payment.Amount = parseFloat(payment.Amount)
            const AnashIdentifier = payment.AnashIdentifier;
            if (!AnashIdentifier) {
                invalidPayments.push[{reason: 'מזהה אנ"ש לא סופק' }];
                throw new Error('מזהה אנ"ש לא סופק');          
            }

            const person = await People.findOne({ AnashIdentifier });
            if (!person) {
                invalidPayments.push[{reason: `מזהה אנ"ש ${AnashIdentifier} לא קיים במערכת` }];
                throw new Error(`מזהה אנ"ש ${AnashIdentifier} לא קיים במערכת`);     
            }

            try {

                const commitment = await exports.getcommitmentbyanashandcampaign(AnashIdentifier, payment.CampainName);


                const updatedCommitment = await updateCommitmentAfterPayment(commitment, payment);
                if (updatedCommitment.success) {
                payment.CommitmentId = commitment._id;
                validPayments.push(payment);
                }
                else {
                    invalidPayments.push[{reason: updatedCommitment.message, AnashIdentifier: payment.AnashIdentifier }];
                }
            } catch (error) {
                console.log(error);
                invalidPayments.push({ reason: error.message, AnashIdentifier: payment.AnashIdentifier });
            }

        }

        // אם כל מזהי האנ"ש תקינים, הוסף את התשלומים
        if (validPayments.length > 0) {
            try {
                console.log('chipopo');

                const payments = await paymentModel.insertMany(validPayments);
                console.log('payments');
                res.status(200).json({
                    status: 'success',
                    payments: payments,
                    numberOfPayments: validPayments.length,
                    invalidPayments: invalidPayments
                });
            }
            catch (error) {
                console.log(error);
                
            }
        }

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload payments',
            error: error.message
        });
    }
});

exports.uploadCommitmentPayment = asyncHandler(async (req, res, next) => {
    try {
        // נבדוק אם הנתונים הם אובייקט יחיד או מערך
        const paymentsData = Array.isArray(req.body) ? req.body : [req.body];

        // בדיקת מזהה אנ"ש עבור כל תשלום
        for (const payment of paymentsData) {
            const AnashIdentifier = payment.AnashIdentifier;
            if (!AnashIdentifier) {
                throw new Error('מזהה אנ"ש לא סופק');
            }

            const person = await People.findOne({ AnashIdentifier });
            if (!person) {
                throw new Error(`מזהה אנ"ש ${AnashIdentifier} לא קיים במערכת`);
            }
        }

        // אם כל מזהי האנ"ש תקינים, הוסף את התשלומים
        const payments = await paymentModel.insertMany(paymentsData);
        res.status(200).json({
            status: 'success',
            payments: payments
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload payments',
            error: error.message
        });
    }
});


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
