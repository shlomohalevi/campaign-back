const asyncHandler = require('express-async-handler');
const pettyCash = require('../models/pettyCashModel');
const AppError = require('../utils/AppError');

exports.getTransactions = asyncHandler(async (req, res, next) => {
    const transactions = await pettyCash.find()
    res.status(200).json({
        status: 'success',
        data: {
            transactions
        }
    })
})