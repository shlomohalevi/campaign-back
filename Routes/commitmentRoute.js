const express = require('express')
const commitmentController = require('../Controllers/commitmentController')
const authController = require('../Controllers/AuthController')
const router = express.Router()

router.route('/').get( authController.protect, commitmentController.getCommitment)
router.route('/upload').post(  authController.protect,  commitmentController.uploadCommitment)
router.route('/get-commitment/:_id').get( authController.protect, commitmentController.getCommitmentById)
router.route('/get-commitment-by-anash-and-campain').get( authController.protect, commitmentController.getcommitmentbyanashandcampaign);
router.route('/getCommitmentsByCampaign/:campainName').get( authController.protect, commitmentController.getCommitmentsByCampaign)
router.route('/delete-commitment/:commitmentId').delete( authController.protect, commitmentController.deleteCommitment)
router.route('/delete-payment/:paymentId').delete( authController.protect, commitmentController.deletePayment)
router.route('/update-commitment-details/:commitmentId').post( authController.protect, commitmentController.updateCommitmentDetails);
router.route('/upload-commitment-payment').post(  authController.protect, commitmentController.uploadCommitmentPayment);
router.route('/add-memorial-day').post( authController.protect, commitmentController.AddMemorialDayToPerson);
router.route('/get-eligible-people/:campainName').get( authController.protect, commitmentController.GetEligblePeopleToMemmorialDay);
router.route('/delete-memorial-day').delete( authController.protect, commitmentController.DeleteMemorialDay);



module.exports = router
// uploadCommitmentPayment