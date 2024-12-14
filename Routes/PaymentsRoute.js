const express = require('express')
const paymentController = require('../Controllers/PaymentsController')
const authController = require('../Controllers/AuthController')
const router = express.Router()
const { normalizeQueryParams } = require('../utils/normalizeQueryParams');


router.route('/review-commitment-payments').post(  authController.protect,normalizeQueryParams, paymentController.reviewCommitmentPayments);
router.route('/upload-commitment-payments').post( authController.protect,normalizeQueryParams, paymentController.uploadPayments);
router.route('/upload-commitment-payment').post( authController.protect,normalizeQueryParams, paymentController.uploadCommitmentPayment);
router.route('/delete-payment/:paymentId').delete( authController.protect,authController.restrictTo(['Admin', 'User']),
 paymentController.deletePayment)
router.route('/get-payments-without-commitment').get( authController.protect,normalizeQueryParams, paymentController.getPaymentsWithoutCommitment)
router.route('/transfer-payment').put( authController.protect,normalizeQueryParams, paymentController.transferPayment)



module.exports = router