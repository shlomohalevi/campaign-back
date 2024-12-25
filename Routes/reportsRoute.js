const express = require('express')
const authController = require('../Controllers/AuthController')
const reportsController = require('../Controllers/ReportsController')
const router = express.Router()
const { normalizeQueryParams } = require('../utils/normalizeQueryParams');



router.route('/commitments-report').post(  authController.protect,normalizeQueryParams, reportsController.commitmentsReport);
router.route('/campain-report').post(  authController.protect,normalizeQueryParams, reportsController.campainReport);
router.route('/campain-payments-report').post(  authController.protect,normalizeQueryParams, reportsController.campainPaymentsReport);
router.route('/date-range-payments-report').post(  authController.protect,normalizeQueryParams, reportsController.dateRangePaymentsReport);


module.exports = router