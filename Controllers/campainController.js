const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const campainModel = require('../models/campaignModel')
const peopleModel = require('../Models/peopleModel')
const commitmentModel2 = require('../models/commitmentsModel')


exports.addCampain = asyncHandler(async (req, res, next) => {
    console.log(req.body);

    const { start, end, CampainName, minimumAmountForMemorialDay } = req.body;
    const hebrewStartDate = start.jewishDateStrHebrew;
    const hebrewEndDate = end.jewishDateStrHebrew;
    const newCampain = await campainModel.create({
        startDate: start.date,
        endDate: end.date, CampainName: CampainName, hebrewStartDate: hebrewStartDate, hebrewEndDate: hebrewEndDate, minimumAmountForMemorialDay: minimumAmountForMemorialDay
    });
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

    const campainName = req.params.campainName;

    try {

        // Find all people whose Campaigns map contains the specified campainName
        const people = await peopleModel.find({ Campaigns: campainName });
        // console.log(people)

        // If no people are found, return a 404 status
        if (!people || people.length === 0) {
            return ('No people found');
        }

        // Return the list of people
        res.status(200).json(people);
    } catch (error) {
        next(new AppError(500, 'Something went wrong')); // Pass the error to the error-handling middleware
    }
});
exports.getPeopleNotInCampain = asyncHandler(async (req, res, next) => {
    const campainName = req.params.campainName;

    try {
        // Find people who either do not have the Campaigns property
        // or have a Campaigns property that does not contain the specified campainName
        const people = await peopleModel.find({
            $and: [
                { isActive: { $eq: true } }, // Ensure isActive is true
                {
                    $or: [
                        { Campaigns: { $exists: false } }, // No Campaigns property
                        { Campaigns: { $ne: campainName } } // Campaigns property does not contain campainName
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
    const { campainName, AnashIdentifier } = req.body;
    console.log(req.body);

    // Find the person by their identifier
    const person = await peopleModel.findOne({ AnashIdentifier });

    if (!person) {
        return res.status(404).json({ message: 'Person not found' });
    }

    // Initialize the Campaigns property as an array if it doesn't exist
    if (!person.Campaigns) {
        person.Campaigns = [];
    }
    if (person.Campaigns.includes(campainName)) {
        return next(new AppError(400, 'Person already added to campaign'));;
    }

    // Add the campaign ID to the person's campaigns array
    person.Campaigns.push(campainName);

    // Save the updated person document
    await person.save();

    res.status(200).json({ message: 'Campaign added to person successfully', person });
});
exports.addPeopleToCampain = asyncHandler(async (req, res, next) => {
    let successcount = 0;
    let failcount = [];
    const { campainName, mappedData } = req.body;

    console.log(campainName, mappedData);

    const campain = await campainModel.findOne({ CampainName: campainName });
    console.log('a');
    if (!campain) {
        return next(new AppError(404, 'Campain not found'));
    }
    if (mappedData.length === 0) {
        return next(new AppError(400, 'No people to add'));
    }
    console.log('b');
    for (const person of mappedData) {
        const personDetails = await peopleModel.findOne({ AnashIdentifier: person.AnashIdentifier });
        if (personDetails) {
            try {
                // בדיקה אם הקמפיין כבר קיים עבור אותו אדם
                if (!personDetails.Campaigns.includes(campainName)) {
                    personDetails.Campaigns.push(campainName);
                    await personDetails.save();
                    successcount += 1;
                } else {
                    failcount.push({
                        AnashIdentifier: person.AnashIdentifier,
                        reason: 'מזהה אנ"ש כבר שייך לקמפיין הזה' // סיבת השגיאה בעברית
                    });
                }
            } catch (error) {
                failcount.push({
                    AnashIdentifier: person.AnashIdentifier,
                    reason: 'שגיאה בעת שמירת המידע בשרת' // סיבת השגיאה בעברית
                });
                console.log(error);
            }
        } else {
            failcount.push({
                AnashIdentifier: person.AnashIdentifier,
                reason: 'מזהה אנ"ש לא נמצא במערכת' // סיבת השגיאה בעברית
            });
        }
    }
    console.log(successcount, failcount);

    res.status(200).json({ successcount, failcount });
});


exports.getCommitmentInCampain = asyncHandler(async (req, res, next) => {
    const campainName = req.params.campainName;
    console.log(campainName);
    if (!campainName) {
        return next(new AppError(404, 'campainId not defined'));
    }

    // מציאת כל ההתחייבויות ששייכות לשם הקמפיין
    const commitments = await commitmentModel2.find({ CampainName: campainName });


    // חישוב כמות ההתחייבויות, סכום ההתחייבות הכולל וסכום ששולם
    let totalCommitted = 0;
    let totalPaid = 0;

    // חישוב סכום ההתחייבויות והסכום ששולם
    commitments.forEach(commitment => {
        totalCommitted += commitment.CommitmentAmount || 0;
        totalPaid += commitment.AmountPaid || 0;
    });

    // קבלת מספר ההתחייבויות
    const numberOfCommitments = commitments.length;

    res.status(200).json({
        status: 'success',
        data: {
            commitments,
            totalCommitted,
            totalPaid,
            numberOfCommitments
        }
    });
});





