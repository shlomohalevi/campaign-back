const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('../models/peopleModel')
const {recordDeleteOperation, recordEditOperation} = require('../utils/RecordOperation')


exports.uploadPeople = asyncHandler(async (req, res, next) => {
  let people = req.body;
  let errorUploads = [];
  let successCount = 0;
  let newDocCount = 0;
  let updatedDocCount = 0;

  // Separate the people into update and insert operations
  const bulkOps = people.map((person) => ({
    updateOne: {
      filter: { AnashIdentifier: person.AnashIdentifier },
      update: { $set: person },
      upsert: true, // If it doesn't exist, create a new document
    },
  }));

  try {
    const result = await peopleModel.bulkWrite(bulkOps, { ordered: false });

    // Count results
    newDocCount = result.upsertedCount;
    updatedDocCount = result.modifiedCount;
    successCount = newDocCount + updatedDocCount;
    if (result.hasWriteErrors()) {
      // Use getWriteErrors to retrieve each error and get the index of failed operations
      errorUploads = result.getWriteErrors().map(err => people[err.index]);
    }
  
    
  } 
  
  catch (error) {
    // Log and collect errors (if `ordered: false`, errors won't stop the execution)
    console.log(error);
    errorUploads = people; // If bulkWrite fails entirely, log all as failed
  }

  res.status(200).json({
    status: 'success',
    errorUploads,
    successCount,
    newDocCount,
    updatedDocCount,
  });
});


// exports.uploadPeople = asyncHandler(async (req, res, next) => {
//   let people = req.body;
//   let errorUploads = [];
//   let successCount = 0;
//   let newDocCount = 0;
//   let updatedDocCount = 0;

//   for (const person of people) {
//     const existingPerson = await peopleModel.findOne( { AnashIdentifier: person.AnashIdentifier } );
    
//     if (existingPerson) {
//       try {
//       await peopleModel.findOneAndUpdate(
//         { AnashIdentifier: person.AnashIdentifier },
//         { $set: person },
//         { new: true}
//       );
//       updatedDocCount += 1;
//       successCount += 1;  // Count as an update
//     } catch (error) {
//       errorUploads.push(person);
//       console.log(error);
//     }

//       }
      
//     else {
//       try
//       {

//         await peopleModel.create(person);
//         newDocCount += 1;
//         successCount += 1;  
//       }
//       catch (error) {
//         errorUploads.push(person);
//         console.log(error);
//       }
//     }

  

//   }

//   res.status(200).json({
//     status: 'success',
//     people,
//     errorUploads,
//     successCount,
//     newDocCount,
//     updatedDocCount
//   });
// });

function isValidUser(person) {
  if(!person?.AnashIdentifier || !person?.FirstName || !person?.LastName) {
    return false;
  }
  return true;
}
    
  

exports.getAlfonChanges = asyncHandler(async (req, res, next) => {
  let peopleArray = req.body;
  const invalidPeople = peopleArray.filter(person => !isValidUser(person));
  const unValidPeoplsCount = invalidPeople.length;
  peopleArray = peopleArray.filter(person => isValidUser(person));

  const statusCounts = {
    exists: 0,
    needsUpdate: 0,
    new: 0,
    notValid: unValidPeoplsCount
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
      console.log( existingPerson );
      const existingPersonObj = existingPerson.toObject();

      const mismatchedKeys = Object.keys(person).filter(key =>
        person[key] != existingPersonObj[key] &&
        !(person[key] === '' && (existingPersonObj[key] === null || existingPersonObj[key] === undefined))
      );
      // console.log(mismatchedKeys)

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
    invalidPeople
  });
});

  
  
  
  
exports.getPeople = asyncHandler(async (req, res, next) => {
  // Destructure isActive from the query or set it to null if not provided
  const { isActive } = req.query;

  // If isActive is not provided, find both active and inactive people
  const query = isActive !== undefined ? { isActive: isActive } : {};
  console.log(query);

  const people = await peopleModel.find(query)
      .select('AnashIdentifier FirstName LastName Address AddressNumber City MobilePhone HomePhone CommitteeResponsibility PartyGroup DonationMethod GroupNumber Classification isActive PersonID -_id');
console.log(people)
  res.status(200).json({
      status: 'success',
      data: {
          people
      }
  });
});

exports.getUserDetails = asyncHandler(async (req, res, next) => {
    const AnashIdentifier = req.params.AnashIdentifier // Trim any whitespace
    
    const userDetails = await peopleModel.findOne({AnashIdentifier: AnashIdentifier});
    
    
    
    res.status(200).json({
        status: 'success', 
        data: {
            userDetails
        }
    });
});
exports.updateUserDetails = asyncHandler(async (req, res, next) => {
    const {AnashIdentifier} = req.body
    const updatedDetails = req.body

    const userDetails = await peopleModel.findOne({AnashIdentifier: AnashIdentifier});
    if (!userDetails) {
        return next(new AppError('User not found', 404));
      }
      // console.log(req.user);
      const recordedOperation =  recordEditOperation({
          
          
              UserFullName: req.user?.FullName,
              Date: new Date(),
              OperationType: 'עריכת פרטי משתמש',
              OldValue: userDetails,
              NewValue: updatedDetails}
      
    );


      const update = { $set: updatedDetails };

      // Only add the operation if it's not null
      if (recordedOperation) {
          update.$push = { Operations: recordedOperation };
      }
      // console.log(recordedOperation);
  
      const updatedUserDetails = await peopleModel.findOneAndUpdate(
          { AnashIdentifier: AnashIdentifier },
          update,
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
    const deletedUser = await peopleModel.findOneAndUpdate({AnashIdentifier: AnashIdentifier, isActive: true}, {isActive: false}, {new: true});
    if (!deletedUser) {
        return next(new AppError('User not found', 404));
    }
    const recordedOperation =  recordDeleteOperation({

        UserFullName: req.user?.FullName,
        Date: new Date(),
        OperationType: 'delete',
        
    })

    if (recordedOperation) {
        deletedUser.Operations.push(recordedOperation);
        await deletedUser.save();
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


