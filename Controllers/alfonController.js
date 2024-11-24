const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('../models/peopleModel')
const {recordDeleteOperation, recordEditOperation} = require('../utils/RecordOperation')


exports.uploadPeople = asyncHandler(async (req, res, next) => {
  const people = req.body;

  // Early return if no data is provided
  if (!Array.isArray(people) || people.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No people data provided',
    });
  }

  let errorUploads = [];
  let successCount = 0;
  let newDocCount = 0;
  let updatedDocCount = 0;

  // Prepare bulk operations
  const bulkOps = people.map((person) => ({
    updateOne: {
      filter: { AnashIdentifier: person.AnashIdentifier },
      update: { $set: person },
      upsert: true, // Create a new document if no match is found
    },
  }));

  try {
    // Execute bulk write operation
    const result = await peopleModel.bulkWrite(bulkOps, { ordered: false });

    // Count results
    newDocCount = result.upsertedCount;
    updatedDocCount = result.modifiedCount;
    successCount = newDocCount + updatedDocCount;

    // Collect errors (if any)
    if (result.writeErrors && result.writeErrors.length > 0) {
      errorUploads = result.writeErrors.map((err) => ({
        person: people[err.index],
        error: err.errmsg,
      }));
    }
  } catch (error) {
    console.error('Bulk write error:', error);

    // Handle bulk write failure
    errorUploads = people.map((person) => ({
      person,
      error: error.message,
    }));
  }

  // Log results
  console.log({ successCount, updatedDocCount, newDocCount, errorUploads });

  // Send response
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


  // Step 1: Create a list of all AnashIdentifiers
  const anashIdentifiers = peopleArray.map(person => person.AnashIdentifier);

  // Step 2: Fetch all matching people from the database in one query
  const existingPeople = await peopleModel.find({ AnashIdentifier: { $in: anashIdentifiers } });
  
  // Step 3: Create a map from AnashIdentifier to existingPerson
  const existingPeopleMap = existingPeople.reduce((map, person) => {
    map[person.AnashIdentifier] = person.toObject();
    return map;
  }, {});

  // Step 4: Loop over peopleArray and check against the map
  peopleArray.forEach(person => {
    const existingPerson = existingPeopleMap[person.AnashIdentifier];

    if (existingPerson) {
      const mismatchedKeys = Object.keys(person).filter(key =>
        person[key] != existingPerson[key] &&
        !(person[key] === '' && (existingPerson[key] === null || existingPerson[key] === undefined))
      );

      const extraKeys = Object.keys(existingPerson).filter(key =>
        !person.hasOwnProperty(key) &&
        existingPerson[key] !== '' &&
        existingPerson[key] !== null &&
        existingPerson[key] !== undefined &&
        !(Array.isArray(existingPerson[key])) &&
        key !== '_id' &&
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

        const existingDiff = mismatchedKeys.concat(extraKeys).reduce((acc, key) => {
          acc[key] = existingPerson[key];
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

        needsUpdateArray.push(removeExcludedFields(existingPerson));
      }
    } else {
      statusCounts.new += 1;
      newArray.push(removeExcludedFields(person));
    }
  });

  res.status(200).json({
    status: 'success',
    statusCounts,
    diffs: diffArray,
    new: newArray,
    needsUpdate: needsUpdateArray,
    invalidPeople
  });
});

  
  
  
  
exports.getPeople = asyncHandler(async (req, res, next) => {
  // Destructure isActive from the query or set it to null if not provided
  const { isActive } = req.query;

  // If isActive is not provided, find both active and inactive people
  const query = isActive !== undefined ? { isActive: isActive } : {};

  const people = await peopleModel.find(query)
      .select('AnashIdentifier FirstName LastName Address AddressNumber City MobilePhone HomePhone CommitteeResponsibility PartyGroup DonationMethod GroupNumber Classification isActive PersonID -_id');
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


