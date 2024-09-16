const express = require('express')
const commitmentController = require('../Controllers/commitmentController')
const router = express.Router()

router.route('/').get(commitmentController.getCommitment)
router.route('/upload').post(commitmentController.uploadCommitment)
router.route('/get-commitment/:_id').get(commitmentController.getCommitmentById)
router.route('/get-commitment-by-anash-and-campain').get(commitmentController.getcommitmentbyanashandcampaign);
router.route('/delete-commitment/:commitmentId').delete(commitmentController.deleteCommitment)
router.route('/update-commitment-details/:commitmentId').post(commitmentController.updateCommitmentDetails);
router.route('/upload-commitment-payment').post(commitmentController.uploadCommitmentPayment);



module.exports = router
// uploadCommitmentPayment