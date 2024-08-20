const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('../Models/peopleModel')


exports.uploadPeople = asyncHandler(async (req, res, next) => {
    let people = null
    for (people of req.body) {
        const newPeople = new peopleModel(people)
        await newPeople.save()
    }
    res.status(200).json({
        status: 'success',
        people: {
            people
        }
        })
})
exports.getPeople = asyncHandler(async (req, res, next) => {
    const people = await peopleModel.find().
    select('anashIdentifier FirstName LastName Address adressNumber City MobilePhone HomePhone CommitteeResponsibility PartyGroup DonationMethod GroupNumber Classification isActive PersonID -_id');
    res.status(200).json({
        status: 'success',
        data: {
            people
        }
    })
})
exports.getUserDetails = asyncHandler(async (req, res, next) => {
    const anashIdentifier = req.params.anashIdentifier // Trim any whitespace
    
    const userDetails = await peopleModel.findOne({anashIdentifier: anashIdentifier});
    
    console.log('Found user details:', userDetails);
    
    
    res.status(200).json({
        status: 'success', 
        data: {
            userDetails
        }
    });
});
exports.updateUserDetails = asyncHandler(async (req, res, next) => {
    console.log('e')
    const {anashIdentifier} = req.body
    const updatedDetails = req.body

    const userDetails = await peopleModel.findOne({anashIdentifier: anashIdentifier});
    if (!userDetails) {
        return next(new AppError('User not found', 404));
    }

    const updatedUserDetails = await peopleModel.findOneAndUpdate(
        { anashIdentifier: anashIdentifier },
        { $set:updatedDetails}, // Only update the fields provided in req.body
        {
            new: true, // Return the updated document
            runValidators: true, // Ensure schema validation is applied
        }
    );
        res.status(200).json({
        status: 'success',
        data: {
            updatedUserDetails
        }
    })
});
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const anashIdentifier = req.params.anashIdentifier
    // const deletedUser = await peopleModel.findOneAndDelete({anashIdentifier: anashIdentifier});
    // if (!deletedUser) {
    //     return next(new AppError('User not found', 404));
    // }
    res.status(200).json({
        status: 'success',
        data: {
            // deletedUser
        }
    })
    
})
