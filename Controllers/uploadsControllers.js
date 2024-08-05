const asyncHandler = require('express-async-handler')
const AppError = require('./../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('./../Models/peopleModel')


exports.uploadPeople = asyncHandler(async (req, res, next) => {
    console.log(req.body)
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
    const people = await peopleModel.find().select('-__v -_id');
    res.status(200).json({
        status: 'success',
        data: {
            people
        }
    })
})

  