const asyncHandler = require('express-async-handler');
const commitmentsModel = require('../models/commitmentsModel');
const paymentModel = require('../models/paymentModel');


exports.uploadCommitment = asyncHandler(async (req, res, next) => {
    try {
        let data = req.body;

        if (!Array.isArray(data)) {
            data = [data];
        }

        const successfulUploads = [];
        const failedUploads = [];

        for (const commitment of data) {
            console.log(commitment);

            try {
                // יצירת ההתחייבות
                const insertedCommitment = await commitmentsModel.create({
                    ...commitment,
                    PaymentsMade: commitment.NumberOfPayments - commitment.PaymentsRemaining,
                    AmountRemaining: commitment.CommitmentAmount - commitment.AmountPaid,
                });

                successfulUploads.push(insertedCommitment);
            } catch (error) {
                failedUploads.push({
                    AnashIdentifier: commitment.AnashIdentifier,
                    PersonID: commitment.PersonID,
                    FirstName: commitment.FirstName,
                    LastName: commitment.LastName,
                    reason: translateErrorToHebrew(error.message), // פונקציה לתרגום השגיאה לעברית
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
    if (errorMessage.includes('PaymentMethod')) {
        return 'אמצעי תשלום לא תקין';
    }
    if (errorMessage.includes('AmountRemaining')) {
        return 'כמות התשלומים שנשארו לא יכולה להיות אפס';
    }
    if (errorMessage.includes('CommitmentAmount') || errorMessage.includes('AmountPaid')) {
        return 'סכום התחייבות אינו יכול להיות קטן מסכום ששולם';
    }
    if (errorMessage.includes('NumberOfPayments')) {
        return 'מספר התשלומים לא יכול להיות קטן ממספר התשלומים שבוצעו';
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

exports.uploadPayment = asyncHandler(async (req, res, next) => {
    try {
        const payments = await paymentModel.insertMany(req.body);
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
