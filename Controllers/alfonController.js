const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('../Models/peopleModel')


exports.uploadPeople = asyncHandler(async (req, res, next) => {
  const people = req.body;

  for (const person of people) {
      await peopleModel.findOneAndUpdate(
          { AnashIdentifier: person.AnashIdentifier },  // search criteria
          { $set: person },  // only update the fields provided in `person`
          { upsert: true, new: true }  // options: create if not exists, return the updated document
      );
  }

  res.status(200).json({
      status: 'success',
      people
  });
});
exports.getAlfonChanges = asyncHandler(async (req, res, next) => {
  const peopleArray = req.body;

  const statusCounts = {
    exists: 0,
    needsUpdate: 0,
    new: 0,
  };

  const diffArray = [];
  const newArray = [];
  const needsUpdateArray = [];

  const removeExcludedFields = (obj) => {
    const { _id, __v, ...rest } = obj;
    return rest;
  };

  await Promise.all(peopleArray.map(async (person) => {
    const existingPerson = await peopleModel.findOne({ AnashIdentifier: person.AnashIdentifier });

    if (existingPerson) {
      const existingPersonObj = existingPerson.toObject();

      const mismatchedKeys = Object.keys(person).filter(key =>
        person[key] != existingPersonObj[key] &&
        !(person[key] === '' && (existingPersonObj[key] === null || existingPersonObj[key] === undefined))
      );

      const extraKeys = Object.keys(existingPersonObj).filter(key =>
        !person.hasOwnProperty(key) &&
        existingPersonObj[key] !== '' &&
        existingPersonObj[key] !== null &&
        existingPersonObj[key] !== undefined &&
        !(Array.isArray(existingPersonObj[key])) &&
        key !== '_id' &&
        key !== 'PersonID' &&
        key !== '__v' &&
        key !== '$__' &&
        key !== '$isNew' &&
        key !== '_doc'
      );

      const isIdentical = mismatchedKeys.length === 0 && extraKeys.length === 0;

      if (isIdentical) {
        statusCounts.exists += 1;
      } else {
        statusCounts.needsUpdate += 1;

        // Create diff object
        const existingDiff = mismatchedKeys.concat(extraKeys).reduce((acc, key) => {
          acc[key] = existingPersonObj[key];
          return acc;
        }, {});

        const uploadedDiff = mismatchedKeys.reduce((acc, key) => {
          acc[key] = person[key];
          return acc;
        }, {});

        diffArray.push({
          AnashIdentifier: existingPerson.AnashIdentifier,
          fullName: existingPerson.FullNameForLists,
          existingPerson: existingDiff,
          uploadedPerson: uploadedDiff,
        });

        // Push to needsUpdateArray, excluding _id and __v
        needsUpdateArray.push(removeExcludedFields(existingPersonObj));
      }
    } else {
      statusCounts.new += 1;

      // Push to newArray, excluding _id and __v
      newArray.push(removeExcludedFields(person));
    }
  }));

  res.status(200).json({
    status: 'success',
    statusCounts,
    diffs: diffArray,
    new: newArray, // Array with new objects, excluding _id and __v
    needsUpdate: needsUpdateArray, // Array with objects needing updates, excluding _id and __v
  });
});

  
  
  
  
  exports.getPeople = asyncHandler(async (req, res, next) => {
    const people = await peopleModel.find().
    select('AnashIdentifier FirstName LastName Address addressNumber City MobilePhone HomePhone CommitteeResponsibility PartyGroup DonationMethod GroupNumber Classification isActive PersonID -_id');
    res.status(200).json({
        status: 'success',
        data: {
            people
        }
    })
})

exports.getUserDetails = asyncHandler(async (req, res, next) => {
    const AnashIdentifier = req.params.AnashIdentifier // Trim any whitespace
    
    const userDetails = await peopleModel.findOne({AnashIdentifier: AnashIdentifier});
    
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
    const {AnashIdentifier} = req.body
    const updatedDetails = req.body

    const userDetails = await peopleModel.findOne({AnashIdentifier: AnashIdentifier});
    if (!userDetails) {
        return next(new AppError('User not found', 404));
    }

    const updatedUserDetails = await peopleModel.findOneAndUpdate(
        { AnashIdentifier: AnashIdentifier },
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
    const AnashIdentifier = req.params.AnashIdentifier
    const deletedUser = await peopleModel.findOneAndDelete({AnashIdentifier: AnashIdentifier});
    if (!deletedUser) {
        return next(new AppError('User not found', 404));
    }
    res.status(200).json({
        status: 'success',
        data: {
            deletedUser
        }
    })
    
})


exports.addPerson = asyncHandler(async (req, res, next) => {
    const newPerson = await peopleModel.create(req.body);
    if(!newPerson) {
        return next(new AppError('שגיאה ביצירת משתמש', 404));
    }
    res.status(201).json({
        status: 'success',
        data: {
            newPerson
        }
    })
})
