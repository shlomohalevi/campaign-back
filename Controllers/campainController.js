const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const campainModel = require('../Models/campaignModel')
const peopleModel = require('../Models/peopleModel')


exports.addCampain = asyncHandler(async (req, res, next) => {
    const { start, end, CampainName } = req.body;
    const hebrewStartDate = start.jewishDateStrHebrew;
    const hebrewEndDate = end.jewishDateStrHebrew;
    const newCampain = await campainModel.create({ startDate: start.date,
         endDate: end.date, CampainName: CampainName ,hebrewStartDate: hebrewStartDate, hebrewEndDate: hebrewEndDate});
    res.status(201).json({
        status: 'success',
        data: {
            newCampain
        }
    })
  
}
 )
exports.getCampains = asyncHandler(async (req, res, next) => {
    const campains = await campainModel.find();
    res.status(200).json({
        status: 'success',
        data: {
            campains: campains
        }
    })
})
exports.getPeopleByCampain = asyncHandler(async (req, res, next) => {
    
    const campainId = req.params.campainId;
    
    try {

        // Find all people whose Campaigns map contains the specified campaignId
        const people = await peopleModel.find({ Campaigns: campainId });
        // console.log(people)

        // If no people are found, return a 404 status
        if (!people || people.length === 0) {
            return next(new AppError(404, 'No people found'));
        }

        // Return the list of people
        res.status(200).json(people);
    } catch (error) {
        next(new AppError(500, 'Something went wrong')); // Pass the error to the error-handling middleware
    }
});
exports.getPeopleNotInCampain = asyncHandler(async (req, res, next) => {
    const campainId = req.params.campainId;

    try {
        // Find people who either do not have the Campaigns property
        // or have a Campaigns property that does not contain the specified campainId
        const people = await peopleModel.find({
            $and: [
                { isActive: { $eq: true } }, // Ensure isActive is true
                {
                    $or: [
                        { Campaigns: { $exists: false } }, // No Campaigns property
                        { Campaigns: { $ne: campainId } } // Campaigns property does not contain campaignId
                    ]
                }
            ]
        });
        // If no people are found, return a 404 status
        if (!people || people.length === 0) {
            return next(new AppError(404, 'No people found'));
        }

        // Return the list of people
        res.status(200).json(people);
    } catch (error) {
        next(new AppError(500, 'Something went wrong')); // Pass the error to the error-handling middleware
    }
});

exports.addPersonToCampaign = asyncHandler(async (req, res, next) => {
    const { campainId, AnashIdentifier } = req.body;

    // Find the person by their identifier
    const person = await peopleModel.findOne({ AnashIdentifier });

    if (!person) {
        return res.status(404).json({ message: 'Person not found' });
    }

    // Initialize the Campaigns property as an array if it doesn't exist
    if (!person.Campaigns) {
        person.Campaigns = [];
    }
    if (person.Campaigns.includes(campainId)) {
        return next(new AppError(400, 'Person already added to campaign'));;
    }

    // Add the campaign ID to the person's campaigns array
    person.Campaigns.push(campainId);

    // Save the updated person document
    await person.save();

    res.status(200).json({ message: 'Campaign added to person successfully', person });
});
exports.addPeopleToCampain = asyncHandler(async (req, res, next) => {
    const { campainId, people } = req.body;
    const campain = await campainModel.findById(campainId);

    if (!campain) {
        return next(new AppError(404, 'Campain not found'));
    }

    if (!people || people.length === 0) {
        return next(new AppError(400, 'No people provided'));
    }

    for (const person of people) {
        const exists = await peopleModel.exists({ AnashIdentifier: person.AnashIdentifier });
        if (!exists) {
            return next(new AppError(404, `Person with ID ${person} does not exist in the database`));
        }
        else {
            if(!person.Campaigns.includes(campainId)) {
                person.Campaigns.push(campainId);
                await person.save();
            }
        }


    }

    res.status(200).json({ message: 'People added to campain successfully' });

});
  

 
 
