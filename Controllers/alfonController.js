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
  
});
  
  


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
  console.log('1')

  // Process and filter people
  for (const person of reviewedPeople) {
    if (!person.AnashIdentifier) {
      invalidPeople.push({ ...person, reason: "מזהה אנש לא סופק" });
      continue;
    }
    if(!person.FirstName || !person.LastName) 
    {
      invalidPeople.push({ ...person, reason: "שם פרטי או שם משפחה לא סופקו" });
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
    console.log('2')

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
      } 
      continue;
    }
    console.log('3')

    // If person doesn't exist in the database, check for AnashIdentifier conflict
    if (existingDBPerson) {
      // Conflict found, compare data
      const conflicts = comparePersonData(existingDBPerson, person);
      if (conflicts) {
        conflictedPeople.push({
          anash: person.AnashIdentifier,
          FirstName: person.FirstName||'',
          LastName: person.LastName||'',
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
  console.log('4')
  // Return feedback
  res.status(200).json({ validPeople, invalidPeople, conflictedPeople });
});

// Helper function to compare person data and identify conflicts
function comparePersonData(existingPerson, uploadedPerson) {
  const uploadedConflicts = {};
  const existingConflicts = {};
  
  
  for (const key of Object.keys(uploadedPerson)) {
      if ( key in existingPerson&& existingPerson[key] && existingPerson[key] != uploadedPerson[key]) {
          uploadedConflicts[key] = uploadedPerson[key];
          existingConflicts[key] = existingPerson[key];
      }
  }
  
  return Object.keys(uploadedConflicts).length > 0 ? { uploaded: uploadedConflicts, existing: existingConflicts } : null;
}  
  

exports.getPeople = asyncHandler(async (req, res, next) => {
  // Destructure isActive from the query or set it to null if not provided
  const { isActive } = req.query;

  // If isActive is not provided, find both active and inactive people
  const query = isActive !== undefined ? { isActive: isActive } : {};

  const people = await peopleModel
    .find(query).
    sort("AnashIdentifier");
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
    OperationType: "עריכה",
    Desc: "עריכת פרטי משתמש",
    OldValues: userDetails,
    NewValues: updatedDetails,
  });

  const update = { $set: updatedDetails };

  // Only add the operation if it's not null
  if (recordedOperation) {
    update.$push = { AlfonOperations: { $each: [recordedOperation] ,$slice: -20} };
    
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
  const session = await mongoose.startSession();
  session.startTransaction(); // Start a transaction

  try {
    const AnashIdentifier = req.params.AnashIdentifier;

    // Find and update the user atomically within the transaction
    const deletedUser = await peopleModel.findOneAndUpdate(
      { AnashIdentifier: AnashIdentifier, isActive: true },
      { isActive: false },
      { new: true, session } // Ensure the operation is part of the transaction
    );

    if (!deletedUser) {
      await session.abortTransaction(); // Abort if user not found
      session.endSession();
      return next(new AppError(404, "User not found"));
    }

    // Create the recorded operation
    const recordedOperation = recordDeleteOperation({
      UserFullName: req.user?.FullName,
      Date: new Date(),
      OperationType: "מחיקה",
      Desc: "מחיקת משתמש",
      Data: deletedUser, // Avoid including entire user object to prevent circular references
    });

    // Add the operation to the user's AlfonOperations array, ensuring it doesn't exceed 20
    if (recordedOperation) {
      await peopleModel.updateOne(
        { AnashIdentifier: AnashIdentifier },
        {
          $push: {
            AlfonOperations: {
              $each: [recordedOperation], // Add the new operation
              $slice: -20, // Keep only the last 20 entries
            },
          },
        },
        { session }
      );
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Respond to the client
    res.status(200).json({
      status: "success",
      data: {
        deletedUser,
      },
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();
    next(new AppError(500, "Transaction failed: " + error.message));
  }
});

exports.addPerson = asyncHandler(async (req, res, next) => {
  const AnashIdentifier = req.body.AnashIdentifier;
  const existingUser = await peopleModel.findOne({ AnashIdentifier: AnashIdentifier });
  if (existingUser) {
    return next(new AppError(400,"משתמש כבר קיים במערכת"));
  }
  
  const newPerson = await peopleModel.create(req.body);
  if (!newPerson) {
    return next(new AppError(404,"שגיאה ביצירת משתמש"));
  }
  res.status(201).json({
    status: "success",
    data: {
      newPerson,
    },
  });
});

exports.recoverUserActivity = asyncHandler(async (req, res, next) => {
  const AnashIdentifier = req.params.AnashIdentifier;
  const recoveredUser = await peopleModel.findOneAndUpdate(
    { AnashIdentifier: AnashIdentifier, isActive: false },
    { isActive: true },
    { new: true }
  );
  if (!recoveredUser) {
    return next(new AppError(404,'משתמש לא נמצא'));
  }
  console.log('yess');
  res.status(200).json({
    status: "success",
    data: {
      recoveredUser,
    },
  });
});
