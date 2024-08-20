const express = require('express')
const  campainController = require('../Controllers/campainController')
const router = express.Router()



router.route('/add-campain').post(campainController.addCampain)
router.route('/get-campains').get(campainController.getCampains)
router.route('/get-campain-people/:campainId').get(campainController.getPeopleByCampain)
router.route('/add-person-to-campain').post(campainController.addPersonToCampaign)
module.exports = router