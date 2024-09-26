const express = require('express')
const  campainController = require('../Controllers/campainController')
const router = express.Router()



router.route('/add-campain').post(campainController.addCampain)
router.route('/get-campains').get(campainController.getCampains)
router.route('/get-campain-people/:campainName').get(campainController.getPeopleByCampain)
router.route('/get-people-not-in-campain/:campainName').get(campainController.getPeopleNotInCampain)
router.route('/add-person-to-campain').post(campainController.addPersonToCampaign)
router.route('/add-people-to-campain').post(campainController.addPeopleToCampain)
router.route('/get-commitment-in-campain/:campainName').get(campainController.getCommitmentInCampain)
router.route('/get-campain-by-name/:campainName').get(campainController.getCampainByName)
router.route('/get-all-memorial-dates/:CampainName').get(campainController.getAllMemorialDates)
module.exports = router