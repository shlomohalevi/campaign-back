const express = require('express')
const uploadsControllers = require('../Controllers/alfonController')
const authController = require('../Controllers/AuthController')
const utils = require('../utils/RecordOperation')
const router = express.Router()

router.route('/get-user-details/:AnashIdentifier').get(uploadsControllers.getUserDetails);
router.route('/').get(uploadsControllers.getPeople)
router.route('/upload').post(uploadsControllers.uploadPeople)
router.route('/update-user-details').post( authController.protect,  uploadsControllers.updateUserDetails)
router.route('/delete-user/:AnashIdentifier').delete(  authController.protect, uploadsControllers.deleteUser)
router.route('/add-user').post(uploadsControllers.addPerson)
router.route('/get-alfon-changes').post(uploadsControllers.getAlfonChanges)
// router.route('/record-operation').post(  utils.recordOperation)
module.exports = router 