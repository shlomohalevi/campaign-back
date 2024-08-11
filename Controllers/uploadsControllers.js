const asyncHandler = require('express-async-handler');
const AppError = require('./../utils/AppError');
const mongoose = require('mongoose');
const peopleModel = require('./../Models/peopleModel');

exports.uploadPeople = asyncHandler(async (req, res, next) => {
    console.log(req.body);
    let people = [];
    for (let person of req.body) {
        const newPerson = new peopleModel(person);
        await newPerson.save();
        people.push(newPerson);
    }
    res.status(200).json({
        status: 'success',
        people: people
    });
});

exports.getPeople = asyncHandler(async (req, res, next) => {
    const people = await peopleModel.find().
        select('anashIdentifier FullNameForLists Address adressNumber City MobilePhone HomePhone CommitteeResponsibility PartyGroup DonationMethod GroupNumber Classification isActive PersonID -_id');
    res.status(200).json({
        status: 'success',
        data: {
            people
        }
    });
});


