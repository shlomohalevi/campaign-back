const express = require('express')
const  campainController = require('../Controllers/campainController')
const router = express.Router()



router.route('/add-campain').post(campainController.addCampain)
router.route('/get-campains').get(campainController.getCampains)
router.route('/get-campain-people/:campainName').get(campainController.getPeopleByCampain)
router.route('/get-people-not-in-campain/:campainName').get(campainController.getPeopleNotInCampain)
router.route('/add-person-to-campain').post(campainController.addPersonToCampaign)
router.route('/delete-person-from-campain/:AnashIdentifier/:CampainName').delete(campainController.deletePersonFromCampain)
router.route('/get-commitment-in-campain/:campainName').get(campainController.getCommitmentInCampain)
router.route('/get-campain-by-name/:campainName').get(campainController.getCampainByName)
router.route('/get-all-memorial-dates/:CampainName').get(campainController.getAllMemorialDates)
router.route('/edit-campain-details/:campainId').post(campainController.editCampainDetails)
router.route('/review-deleted-memorial-dates/:campainId').post(campainController.reviewDeletedMemorialDays)
router.route('/review-befour-add-people-to-campain').post(campainController.reviewBeforeAddPeopleToCampaign)
router.route('/add-people-to-campain').post(campainController.addPeopleToCampaign)

module.exports = router