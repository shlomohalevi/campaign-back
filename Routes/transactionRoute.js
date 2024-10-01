const express = require('express')
const transactionController = require('../Controllers/transactionController')
const router = express.Router()

router.route('/').get(transactionController.getTransactions)

module.exports = router