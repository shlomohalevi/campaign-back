const asyncHandler = require("express-async-handler");
const AppError = require("../utils/AppError");
const mongoose = require("mongoose");
const peopleModel = require("../models/peopleModel");
const {
  recordDeleteOperation,
  recordEditOperation,
} = require("../utils/RecordOperation");

exports.uploadPeople = asyncHandler(async (req, res, next) => {
  const people = req.body;

  // Early return if no data is provided
  if (!Array.isArray(people) || people.length === 0) {
    return next(new AppError("No data provided", 400));
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

    // Execute bulk write operation
    try {
      const result = await peopleModel.bulkWrite(bulkOps, { ordered: false });
      console.log("BulkWrite Result:", result);
  
      // Check for write errors using `hasWriteErrors()` (MongoDB-specific errors)
      if (result.hasWriteErrors()) {
          console.error("Bulk write errors:", result.getWriteErrors());
  
          // Pass an error to the next middleware
          return next(new AppError(400, "Bulk write encountered errors."));
      }
  
      // Check for validation errors (specific to Mongoose)
      if (result.mongoose?.validationErrors && result.mongoose.validationErrors.length > 0) {
          console.error("Validation errors:", result.mongoose.validationErrors);
          return next(new AppError(400, "Validation errors in bulk write."));
      }
  
      // Log successful operation details
      console.log(`
          Inserted: ${result.nInserted || 0}, 
          Matched: ${result.nMatched || 0}, 
          Modified: ${result.nModified || 0}, 
          Upserted: ${result.nUpserted || 0}
      `);
  
      // Respond with success
      res.status(200).json({
          status: "success",
          message: "Bulk write operation completed successfully",
          details: {
              inserted: result.nInserted || 0,
              matched: result.nMatched || 0,
              modified: result.nModified || 0,
              upserted: result.nUpserted || 0,
          },
      });
  
  } catch (error) {
      // Catch MongoDB or Mongoose errors
      console.error("Bulk write exception:", error);
  
      // Handle specific Mongoose validation errors
      if (error.name === "ValidationError") {
          return next(new AppError(400, `Validation Error: ${error.message}`));
      }
  
      // General error handler
      return next(new AppError(500, "Failed to perform bulk write."));
  }
  
  
  console.log('result', result);    
  
  res.status(200).json({
    status: "success",
  });
});

// Count results
// newDocCount = result.upsertedCount;
// updatedDocCount = result.modifiedCount;
// successCount = newDocCount + updatedDocCount;

// Collect errors (if any)
// if (result.writeErrors && result.writeErrors.length > 0) {
//   errorUploads = result.writeErrors.map((err) => ({
//     person: people[err.index],
//     error: err.errmsg,
//   }));
// }

// Log results

// Send response
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

exports.reviewUploadedPeople = asyncHandler(async (req, res, next) => {
  const reviewedPeople = req.body;
  const validPeople = [];
  const invalidPeople = [];
  const conflictedPeople = [];
  const personIdMap = new Map(); // For PersonID duplicates
  const anashMap = new Map(); // For AnashIdentifier duplicates

  // Fetch existing DB people
  const dbPeople = await peopleModel.find();
  const existingDBPeopleMap = new Map(dbPeople.map((person) => [person.AnashIdentifier, person]));
  const existingDBPersonIdsMap = new Map(
    dbPeople.filter((person) => person.PersonID).map((person) => [String(person.PersonID), person]) // Normalize PersonID to string
  );

  // Process and filter people
  for (const person of reviewedPeople) {
    if (!person.AnashIdentifier) {
      invalidPeople.push({ ...person, reason: "מזהה אנש לא סופק" });
      continue;
    }

    person.AnashIdentifier = String(person.AnashIdentifier);

    // Check PersonID for uniqueness
    if (person.PersonID) {
      const personIdAsString = String(person.PersonID); // Ensure PersonID is a string
      if (personIdMap.has(personIdAsString)) {
        invalidPeople.push({
          ...person,
          reason: "הועלה מידע עם אותו מספר זהות יותר מפעם אחת",
        });
        continue;
      }
      personIdMap.set(personIdAsString, person);
    }

    // Check if the uploaded person is a duplicate by AnashIdentifier
    if (anashMap.has(person.AnashIdentifier)) {
      invalidPeople.push({
        ...person,
        reason: "הועלה מידע עם אותו מזהה אנש יותר מפעם אחת",
      });
      continue;
    }
    anashMap.set(person.AnashIdentifier, person);

    // Check if the person exists in the database
    const existingDBPerson = existingDBPeopleMap.get(person.AnashIdentifier);
    const existingDBPersonId = existingDBPersonIdsMap.get(String(person.PersonID)); // Normalize PersonID to string

    if (existingDBPersonId) {
      // If the existing person has a different AnashIdentifier, it's an error
      if (existingDBPersonId.AnashIdentifier != person.AnashIdentifier) {
        invalidPeople.push({
          ...person,
          reason: "הועלה מידע עם מספר זהות שכבר קיים במערכת, אבל מזהה אנש שונה",
        });
      } else {
        // If the same PersonID exists with the same AnashIdentifier, treat it as a conflict
        conflictedPeople.push({
          anash: person.AnashIdentifier,
          uploaded: person,
          existing: existingDBPersonId,
        });
      }
      continue;
    }

    // If person doesn't exist in the database, check for AnashIdentifier conflict
    if (existingDBPerson) {
      // Conflict found, compare data
      const conflicts = comparePersonData(existingDBPerson, person);
      if (conflicts) {
        conflictedPeople.push({
          anash: person.AnashIdentifier,
          uploaded: conflicts.uploaded,
          existing: conflicts.existing,
        });
      } else {
        validPeople.push(person); // No conflict, valid person
      }
    } else {
      validPeople.push(person); // No existing match, valid person
    }
  }

  // Return feedback
  res.status(200).json({ validPeople, invalidPeople, conflictedPeople });
});

// Helper function to compare person data and identify conflicts
function comparePersonData(existingPerson, uploadedPerson) {
  const uploadedConflicts = {};
  const existingConflicts = {};

  for (const key of Object.keys(uploadedPerson)) {
    if (existingPerson[key] != uploadedPerson[key]) {
      uploadedConflicts[key] = uploadedPerson[key];
      existingConflicts[key] = existingPerson[key];
    }
  }

  return Object.keys(uploadedConflicts).length > 0
    ? { uploaded: uploadedConflicts, existing: existingConflicts }
    : null;
}
  
  
    





  


  
  
  


      
// const existingPeople = await peopleModel.find({ AnashIdentifier: { $in: anashIdentifiers } });

// exports.getAlfonChanges = asyncHandler(async (req, res, next) => {
//   let peopleArray = req.body;
//   const invalidPeople = peopleArray.filter(person => !isValidUser(person));
//   const unValidPeoplsCount = invalidPeople.length;
//   peopleArray = peopleArray.filter(person => isValidUser(person));

//   const statusCounts = {
//     exists: 0,
//     needsUpdate: 0,
//     new: 0,
//     notValid: unValidPeoplsCount
//   };

//   const diffArray = [];
//   const newArray = [];
//   const needsUpdateArray = [];

//   const removeExcludedFields = (obj) => {
//     const { _id, __v, ...rest } = obj;
//     return rest;
//   };

//   // Step 1: Create a list of all AnashIdentifiers
//   const anashIdentifiers = peopleArray.map(person => person.AnashIdentifier);

//   // Step 2: Fetch all matching people from the database in one query
//   const existingPeople = await peopleModel.find({ AnashIdentifier: { $in: anashIdentifiers } });

//   // Step 3: Create a map from AnashIdentifier to existingPerson
//   const existingPeopleMap = existingPeople.reduce((map, person) => {
//     map[person.AnashIdentifier] = person.toObject();
//     return map;
//   }, {});

//   // Step 4: Loop over peopleArray and check against the map
//   peopleArray.forEach(person => {
//     const existingPerson = existingPeopleMap[person.AnashIdentifier];

//     if (existingPerson) {
//       const mismatchedKeys = Object.keys(person).filter(key =>
//         person[key] != existingPerson[key] &&
//         !(person[key] === '' && (existingPerson[key] === null || existingPerson[key] === undefined))
//       );

//       const extraKeys = Object.keys(existingPerson).filter(key =>
//         !person.hasOwnProperty(key) &&
//         existingPerson[key] !== '' &&
//         existingPerson[key] !== null &&
//         existingPerson[key] !== undefined &&
//         !(Array.isArray(existingPerson[key])) &&
//         key !== '_id' &&
//         key !== '__v' &&
//         key !== '$__' &&
//         key !== '$isNew' &&
//         key !== '_doc'
//       );

//       const isIdentical = mismatchedKeys.length === 0 && extraKeys.length === 0;
//       if (isIdentical) {
//         statusCounts.exists += 1;
//       } else {
//         statusCounts.needsUpdate += 1;

//         const existingDiff = mismatchedKeys.concat(extraKeys).reduce((acc, key) => {
//           acc[key] = existingPerson[key];
//           return acc;
//         }, {});

//         const uploadedDiff = mismatchedKeys.reduce((acc, key) => {
//           acc[key] = person[key];
//           return acc;
//         }, {});

//         diffArray.push({
//           AnashIdentifier: existingPerson.AnashIdentifier,
//           fullName: existingPerson.FullNameForLists,
//           existingPerson: existingDiff,
//           uploadedPerson: uploadedDiff,
//         });

//         needsUpdateArray.push(removeExcludedFields(existingPerson));
//       }
//     } else {
//       statusCounts.new += 1;
//       newArray.push(removeExcludedFields(person));
//     }
//   });

//   res.status(200).json({
//     status: 'success',
//     statusCounts,
//     diffs: diffArray,
//     new: newArray,
//     needsUpdate: needsUpdateArray,
//     invalidPeople
//   });
// });

exports.getPeople = asyncHandler(async (req, res, next) => {
  // Destructure isActive from the query or set it to null if not provided
  const { isActive } = req.query;

  // If isActive is not provided, find both active and inactive people
  const query = isActive !== undefined ? { isActive: isActive } : {};

  const people = await peopleModel
    .find(query)
    .select(
      "AnashIdentifier FirstName LastName Address AddressNumber City MobilePhone HomePhone CommitteeResponsibility PartyGroup DonationMethod GroupNumber Classification isActive PersonID -_id"
    );
  res.status(200).json({
    status: "success",
    data: {
      people,
    },
  });
});

exports.getUserDetails = asyncHandler(async (req, res, next) => {
  const AnashIdentifier = req.params.AnashIdentifier; // Trim any whitespace

  const userDetails = await peopleModel.findOne({
    AnashIdentifier: AnashIdentifier,
  });

  res.status(200).json({
    status: "success",
    data: {
      userDetails,
    },
  });
});
exports.updateUserDetails = asyncHandler(async (req, res, next) => {
  const { AnashIdentifier } = req.body;
  const updatedDetails = req.body;

  const userDetails = await peopleModel.findOne({
    AnashIdentifier: AnashIdentifier,
  });
  if (!userDetails) {
    return next(new AppError("User not found", 404));
  }
  // console.log(req.user);
  const recordedOperation = recordEditOperation({
    UserFullName: req.user?.FullName,
    Date: new Date(),
    OperationType: "עריכת פרטי משתמש",
    OldValue: userDetails,
    NewValue: updatedDetails,
  });

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
    status: "success",
    data: {
      updatedUserDetails,
    },
  });
});
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const AnashIdentifier = req.params.AnashIdentifier;
  const deletedUser = await peopleModel.findOneAndUpdate(
    { AnashIdentifier: AnashIdentifier, isActive: true },
    { isActive: false },
    { new: true }
  );
  if (!deletedUser) {
    return next(new AppError("User not found", 404));
  }
  const recordedOperation = recordDeleteOperation({
    UserFullName: req.user?.FullName,
    Date: new Date(),
    OperationType: "delete",
  });

  if (recordedOperation) {
    deletedUser.Operations.push(recordedOperation);
    await deletedUser.save();
  }
  res.status(200).json({
    status: "success",
    data: {
      deletedUser,
    },
  });
});

exports.addPerson = asyncHandler(async (req, res, next) => {
  const newPerson = await peopleModel.create(req.body);
  if (!newPerson) {
    return next(new AppError("שגיאה ביצירת משתמש", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      newPerson,
    },
  });
});
