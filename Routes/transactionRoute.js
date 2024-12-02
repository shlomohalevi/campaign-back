const express = require('express')
const transactionController = require('../Controllers/transactionController')
const authController = require('../Controllers/AuthController')
const router = express.Router()

router.route('/').get( authController.protect,  transactionController.getTransactions)
router.route('/delete-transaction').delete( authController.protect,transactionController.deleteTransaction)
router.route('/create-expense').post( authController.protect, transactionController.addExpense)
module.exports = router

