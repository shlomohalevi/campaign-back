const express = require('express')
const uploadsControllers = require('../Controllers/alfonController')
const router = express.Router()

router.route('/get-user-details/:anashIdentifier').get(uploadsControllers.getUserDetails);
router.route('/').get(uploadsControllers.getPeople)
router.route('/upload').post(uploadsControllers.uploadPeople)
router.route('/update-user-details').post(uploadsControllers.updateUserDetails)
module.exports = router