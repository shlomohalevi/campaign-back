const asyncHandler = require('express-async-handler');
const pettyCash = require('../models/pettyCashModel');
const AppError = require('../utils/AppError');

exports.getTransactions = asyncHandler(async (req, res, next) => {
    const transactions = await pettyCash.find().sort({ TransactionDate: 1 });
    res.status(200).json({
        status: 'success',
        data: {
            transactions
        }
    })
})
exports.deleteTransaction = asyncHandler(async (req, res, next) => {
    const transactionId = req.query.transactionId
    const transaction = await pettyCash.findByIdAndDelete(transactionId)
    if(!transaction) {
        return next(new AppError('Transaction not found', 404))
        }
    res.status(200).json({
        status:'success',
    })
})

exports.addExpense = asyncHandler(async (req, res, next) => {
    const data = req.body
    const expense = await pettyCash.create(data)
    if(!expense) {
        return next(new AppError('expense not created', 404))
        }
    res.status(200).json({
        status: 'success',
    })
})