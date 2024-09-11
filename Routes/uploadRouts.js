const express = require('express')
const uploadsControllers = require('../Controllers/alfonController')
const router = express.Router()

router.route('/get-user-details/:AnashIdentifier').get(uploadsControllers.getUserDetails);
router.route('/').get(uploadsControllers.getPeople)
router.route('/upload').post(uploadsControllers.uploadPeople)
router.route('/update-user-details').post(uploadsControllers.updateUserDetails)
router.route('/delete-user/:AnashIdentifier').delete(uploadsControllers.deleteUser)
router.route('/add-user').post(uploadsControllers.addPerson)
router.route('/get-alfon-changes').post(uploadsControllers.getAlfonChanges)
module.exports = router 