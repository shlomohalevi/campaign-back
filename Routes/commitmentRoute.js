const express = require('express')
const commitmentController = require('../Controllers/commitmentController')
const router = express.Router()

router.route('/').get(commitmentController.getCommitment)
router.route('/upload').post(commitmentController.uploadCommitment)
router.route('/uploadPayment').post(commitmentController.uploadPayment);
router.route('/uploadCommitmentPayment').post(commitmentController.uploadCommitmentPayment);
router.route('/get-commitment/:_id').get(commitmentController.getCommitmentById)
router.route('/getcommitmentbyanashandcampaign/:AnashIdentifier/:CampainName').get(commitmentController.getcommitmentbyanashandcampaign);
router.route('/delete-commitment/:commitmentId').delete(commitmentController.deleteCommitment)
router.route('/update-commitment-details/:commitmentId').post(commitmentController.updateCommitmentDetails);



module.exports = router