const express = require('express')
const commitmentCOntroller = require('../Controllers/commitmentController')
const router = express.Router()

router.route('/upload').post(commitmentCOntroller.uploadCommitment)

module.exports = router