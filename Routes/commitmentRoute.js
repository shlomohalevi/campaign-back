const express = require('express')
const commitmentController = require('../Controllers/commitmentController')
const authController = require('../Controllers/AuthController')
const router = express.Router()
const { normalizeQueryParams } = require('../utils/normalizeQueryParams');

router.route('/').get( authController.protect, commitmentController.getCommitment)
router.route('/get-commitment/:_id').get( authController.protect, commitmentController.getCommitmentById)
router.route('/add-memorial-day').post( authController.protect,normalizeQueryParams, commitmentController.AddMemorialDayToPerson);
router.route('/get-eligible-people/:campainName').get( authController.protect,normalizeQueryParams, commitmentController.GetEligblePeopleToMemmorialDay);
router.route('/delete-memorial-day').delete( authController.protect,normalizeQueryParams, commitmentController.DeleteMemorialDay);
router.route('/review-commitments').post( authController.protect, normalizeQueryParams, commitmentController.reviewCommitments);
router.route('/upload-commitments').post( authController.protect,normalizeQueryParams, commitmentController.uploadCommitments);
router.route('/review-commitment-payments').post(  authController.protect,normalizeQueryParams, commitmentController.reviewCommitmentPayments);
router.route('/upload-commitment-payments').post( authController.protect,normalizeQueryParams, commitmentController.uploadPayments);
router.route('/getCommitmentsByCampaign').get( authController.protect,normalizeQueryParams, commitmentController.getCommitmentsByCampaign)
router.route('/update-commitment-details').post( authController.protect,normalizeQueryParams, commitmentController.updateCommitmentDetails);
router.route('/upload-commitment-payment').post( authController.protect,normalizeQueryParams, commitmentController.uploadCommitmentPayment);
router.route('/delete-payment/:paymentId').delete( authController.protect,authController.restrictTo(['Admin', 'User']),
 commitmentController.deletePayment)
router.route('/delete-commitment/:commitmentId').delete( authController.protect,normalizeQueryParams, commitmentController.deleteCommitment)




module.exports = router
// uploadCommitmentPayment