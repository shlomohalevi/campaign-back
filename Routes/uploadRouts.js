const express = require('express')
const uploadsControllers = require('../Controllers/uploadsControllers')
const router = express.Router()

// router.route('/').get(uploadsControllers.getPeople)
router.route('/').post(uploadsControllers.uploadPeople)

module.exports = router