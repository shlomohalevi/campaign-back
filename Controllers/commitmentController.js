const asyncHandler = require('express-async-handler');
const commitmentsModel = require('../models/commitmentsModel'); 
const paymentModel= require('../models/paymentModel');

exports.uploadCommitment = asyncHandler(async (req, res, next) => {
    await commitmentsModel.insertMany(req.body);
    const commitments = await commitmentsModel.find();
    res.status(200).json({
        status: 'success',
        commitments: commitments
    });
});

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
    console.log(req.body);
    await paymentModel.insertMany(req.body);
    const payments = await paymentModel.find();
    res.status(200).json({
        status: 'success',
        payments: payments
    });
});

exports.getCommitmentById = asyncHandler(async (req, res, next) => {
    console.log('200');
    
    const commitmentId = req.params._id;
    console.log('Commitment ID:', commitmentId);
    
    const commitmentDetails = await commitmentsModel.findById(commitmentId);
    console.log('Commitment details:', commitmentDetails);
    
    if (!commitmentDetails) {
        return res.status(404).json({
            status: 'fail',
            message: 'Commitment not found'
        });
    }

    console.log('Found commitment details:', commitmentDetails);
    
    res.status(200).json({
        status: 'success',
        data: {
            commitmentDetails
        }
    });
});
