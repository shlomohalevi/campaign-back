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
    // const people = await peopleModel.insertMany(req.body)
    res.status(200).json({
        status: 'success',
        data: {
            people
        }
    })
})

  