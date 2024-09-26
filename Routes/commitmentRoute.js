const express = require('express')
const commitmentController = require('../Controllers/commitmentController')
const router = express.Router()

router.route('/').get(commitmentController.getCommitment)
router.route('/upload').post(commitmentController.uploadCommitment)
router.route('/get-commitment/:_id').get(commitmentController.getCommitmentById)
router.route('/get-commitment-by-anash-and-campain').get(commitmentController.getcommitmentbyanashandcampaign);
router.route('/getCommitmentsByCampaign/:campainName').get(commitmentController.getCommitmentsByCampaign)
router.route('/delete-commitment/:commitmentId').delete(commitmentController.deleteCommitment)
router.route('/delete-payment/:paymentId').delete(commitmentController.deletePayment)
router.route('/update-commitment-details/:commitmentId').post(commitmentController.updateCommitmentDetails);
router.route('/upload-commitment-payment').post(commitmentController.uploadCommitmentPayment);
router.route('/add-memorial-day').post(commitmentController.AddMemorialDayToPerson);
router.route('/get-eligible-people/:campainName').get(commitmentController.GetEligblePeopleToMemmorialDay);
router.route('/delete-memorial-day').delete(commitmentController.DeleteMemorialDay);



module.exports = router
// uploadCommitmentPayment