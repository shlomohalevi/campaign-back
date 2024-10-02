const express = require('express')
const transactionController = require('../Controllers/transactionController')
const router = express.Router()

router.route('/').get(transactionController.getTransactions)
router.route('/delete-transaction').delete(transactionController.deleteTransaction)
router.route('/create-expense').post(transactionController.addExpense)
module.exports = router

