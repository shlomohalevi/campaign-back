const express = require('express')
const commitmentController = require('../Controllers/commitmentController')
const router = express.Router()

router.route('/').get(commitmentController.getCommitment)
router.route('/upload').post(commitmentController.uploadCommitment)
router.route('/uploadPayment').post(commitmentController.uploadPayment);
router.route('/get-commitment/:_id').get(commitmentController.getCommitmentById)

module.exports = router