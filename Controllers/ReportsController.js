const asyncHandler = require("express-async-handler");
const commitmentsModel = require("../models/commitmentsModel");
const campainModel = require("../models/campaignModel");
const paymentModel = require("../models/paymentModel");
const People = require("../models/peopleModel");
const pettyCash = require("../models/pettyCashModel");
const AppError = require("../utils/AppError");




exports.commitmentsReport = asyncHandler(async (req, res, next) => {
    const reportData = req.body;
    // console.log(reportData)
    const selectedCampains = reportData.selectedCampains;

    if (selectedCampains.length === 0) {
        return next(new AppError(400,"חובה לבחור קמפיין "));
    }
    const campainsNamesToCompare = reportData.campainsToCompare;

    const selectedCommitmentFields = reportData.selectedFields.commitmentFields;
    // console.log(selectedCommitmentFields)
    const selectedAlfonFields = reportData.selectedFields.alfonFields;
    const groupByField = reportData.groupByField;
    const sortByField = reportData.sortByField;
    // console.log(sortByField)
    const originalFields = selectedCommitmentFields.concat(selectedAlfonFields);
    // console.log(selectedAlfonFields)
    const allFields = selectedCommitmentFields
    .concat(selectedAlfonFields)
    .concat(['-_id', 'AnashIdentifier' ,'LastName',groupByField])
    .join(' ');
    // console.log(allFields)
    
  
  
    if (originalFields?.length === 0) {
        return next(new AppError(400,"חייב לבחור לפחות שדה אחד"));
    }
    // console.log(allFields)

    let commitments = await commitmentsModel.find({ CampainName: { $in: selectedCampains } }).select(allFields).lean();
    const campainsPeople = await People
    .find({ Campaigns: { $in: selectedCampains } })
    .select(allFields)
    .lean();
    // console.log(campainsPeople)
        //   console.log(campainsPeople)
    const campainPeopleMap = new Map(campainsPeople.map(person => [person.AnashIdentifier, person]));
    // console.log(campainPeopleMap)

    const allDbCommitments = await commitmentsModel.find().lean();
    const allDbCommitmentsMap = new Map(allDbCommitments.map(commitment => [commitment.AnashIdentifier+commitment.CampainName, commitment]));
    const updatedCommitments = commitments.map((commitment) => {
        const AnashIdentifier = commitment.AnashIdentifier;
    
        // Update commitment for each campaign to compare
        campainsNamesToCompare.forEach((commitmentToCompare) => {
            const previousCampaignName = commitmentToCompare;
            const previousCommitment = allDbCommitmentsMap.get(AnashIdentifier + previousCampaignName);
    
            if (previousCommitment) {
                commitment[previousCampaignName +" "+ "סכום התחייבות"] = previousCommitment.CommitmentAmount;
            }
            // } else {
            //     commitment[previousCampaignName +" "+ "סכום התחייבות"] = 'אין התחייבות בקמפיין';
            // }
        });
    
        // Update commitment with person details
        const pesonAlfonDetails = campainPeopleMap.get(AnashIdentifier);
        if (pesonAlfonDetails) {
            // Return a new object combining the commitment and the person details
            return { ...commitment, ...pesonAlfonDetails };
        }
    
        // Return the original commitment if no person details are found
        return commitment;
    });
    const incldeGroupByField= groupByField && originalFields.includes(groupByField);
    let includAnash = false;
    if (originalFields.includes('AnashIdentifier')) {
        includAnash = true;
    }

// console.log(commitments)
const groupedData = updatedCommitments.reduce((groups, item) => {
    // Grouping items by groupByField
    const groupKey = groupByField && item[groupByField] ? item[groupByField] : 'ungrouped';
    if (!groups[groupKey]) {
        groups[groupKey] = [];
    }
    
    // Remove group field if not needed
    if (groupByField && !incldeGroupByField) {
        delete item[groupByField];  
    }

    // Optionally remove 'AnashIdentifier' based on conditions
    if (groupByField !== "AnashIdentifier" && !includAnash) {
        delete item.AnashIdentifier;
    }

    groups[groupKey].push(item);
    return groups;
}, {});

// Sort the groups themselves (group keys)
const sortedGroupKeys = Object.keys(groupedData).sort((a, b) => {
    return a.localeCompare(b); // Sort group keys lexicographically
});

// Create a new object to store the sorted grouped data
const sortedGroupedData = {};
sortedGroupKeys.forEach(key => {
    sortedGroupedData[key] = groupedData[key];
});
if (sortByField) {
    Object.keys(sortedGroupedData).forEach(key => {
        sortedGroupedData[key].sort((a, b) => {
            const valueA = a[sortByField];
            const valueB = b[sortByField];
            // console.log(valueA, valueB)

            // Compare by groupByField first
            if (valueA !== valueB) {
                // If they are different, return the comparison for the groupByField
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    return valueA - valueB; // Numeric comparison
                }
                return String(valueA).localeCompare(String(valueB)); // Lexicographical comparison
            }
            // console.log(valueA, valueB)
            // If the groupByField is the same, compare by sortByField (e.g., LastName)
            const sortValueA = a.LastName;
            const sortValueB = b.LastName;

            // Handle lexicographical sorting for the secondary field (e.g., LastName)
            return String(sortValueA).localeCompare(String(sortValueB));
        });
    });
} else {
    // If no sortByField is provided, just sort by LastName (default secondary sort)
        Object.keys(sortedGroupedData).forEach(key => {
            sortedGroupedData[key].sort((a, b) => {
                const valueA = a.LastName;
                const valueB = b.LastName;
    
                // Lexicographical sorting for LastName
                return String(valueA).localeCompare(String(valueB));
            });
        });
    
    }
    if(!originalFields.includes('LastName')) 
    {
        Object.keys(sortedGroupedData).forEach(key => {
            sortedGroupedData[key].forEach(item => {
                delete item.LastName;
            });
            
        });
    }

// console.log(sortedGroupedData);
          


        
        res.status(200).json({
        status: "success",
        reportData: sortedGroupedData,
    });

});


exports.campainReport = asyncHandler(async (req, res, next) => {

    const reportData = req.body;
    // console.log(reportData)
    const campainName = reportData.selectedCampains[0];

    if (!campainName) {
        return next(new AppError(400, "לא זוהה קמפיין"));
    }
    let campainsNamesToCompare = reportData.campainsToCompare;

    const selectedCommitmentFields = reportData.selectedFields.commitmentFields;
    // console.log(selectedCommitmentFields)
    const selectedAlfonFields = reportData.selectedFields.alfonFields;
    const groupByField = reportData.groupByField;

    const sortByField = reportData.sortByField;
    // console.log(sortByField)
    const originalFields = selectedCommitmentFields.concat(selectedAlfonFields);
    // console.log(selectedAlfonFields)
    const allFields = selectedCommitmentFields
    .concat(selectedAlfonFields)
    .concat(['-_id', 'AnashIdentifier','LastName' ,groupByField])
    .join(' ');
    
    if (originalFields.length === 0) {
        return next(new AppError(400,"חייב לבחור לפחות שדה אחד"));
    }
    campainsNamesToCompare.push(campainName);
    let commitments = await commitmentsModel.find({ CampainName: campainName }).select(allFields).lean();
    const commitmentCampainMap = new Map(commitments.map(commitment => [commitment.AnashIdentifier+campainName, commitment]));
    // console.log(commitmentCampainMap)
    let campainPeople = await People.find({ Campaigns: { $in: [campainName] }}).select(allFields).lean();


    const allDbCommitments = await commitmentsModel.find().lean();
    const allDbCommitmentsMap = new Map(allDbCommitments.map(commitment => [commitment.AnashIdentifier+commitment.CampainName, commitment]));
    const campains = await campainModel.find({CampainName: {$in: campainsNamesToCompare}}).lean();
    const campainsMap = new Map(campains.map(campain => [campain.CampainName, campain]));
    const updatedData = campainPeople.map((person) => {
        const AnashIdentifier = person.AnashIdentifier;
        let latestCommitmentDate = null;
        let latestPaymentMethod = null;
        let latestCampainCommitmentName = null
    
        campainsNamesToCompare.forEach((campainToCompare) => {
            const previousCampaignName = campainToCompare;
            const previousCommitment = allDbCommitmentsMap.get(AnashIdentifier + previousCampaignName);
    
            if (previousCommitment) {
                person[previousCampaignName +" "+ "סכום התחייבות"] = previousCommitment.CommitmentAmount;
                const campain = campainsMap.get(previousCampaignName); 
                if (campain) {
                    const campainDate = new Date(campain.startDate);
                    if(latestCommitmentDate === null || campainDate > latestCommitmentDate) {
                        latestCommitmentDate = campainDate;
                        latestPaymentMethod = previousCommitment.PaymentMethod;
                        latestCampainCommitmentName = previousCampaignName
                    }
                }
                
            } 
            // else {
            //     person[previousCampaignName +" "+ "סכום התחייבות"] = 'אין התחייבות בקמפיין';
            // }
        });
        if(latestCommitmentDate) 
        {
            person[latestCampainCommitmentName +" "+ "אופן תשלום"] = latestPaymentMethod;

        }
        // person[previousCampaignName +" "+ "אופן תשלום"] = previousCommitment.PaymentMethod;

        const commitmentDetails = commitmentCampainMap.get(AnashIdentifier + campainName);
        // console.log(AnashIdentifier+campainName)
        if (commitmentDetails) 
        {
            return { ...person, ...commitmentDetails };
        }
    
        return person;
    });
    // console.log(updatedData)
    const incldeGroupByField = groupByField && originalFields.includes(groupByField);
    let includAnash = false;
    if (originalFields.includes('AnashIdentifier')) {
        includAnash = true;
    }
    // console.log(updatedData)

    const groupedData = updatedData.reduce((groups, item) => {
    // Grouping items by groupByField
    const groupKey = groupByField && item[groupByField] ? item[groupByField] : 'ungrouped';
    if (!groups[groupKey]) {
        groups[groupKey] = [];
    }
    
    // Remove group field if not needed
    if (groupByField && !incldeGroupByField) {
        delete item[groupByField];  
    }

    // Optionally remove 'AnashIdentifier' based on conditions
    if (groupByField !== "AnashIdentifier" && !includAnash) {
        delete item.AnashIdentifier;
    }

    groups[groupKey].push(item);
    return groups;
}, {});

// Sort the groups themselves (group keys)
const sortedGroupKeys = Object.keys(groupedData).sort((a, b) => {
    return a.localeCompare(b); // Sort group keys lexicographically
});
const sortedGroupedData = {};
sortedGroupKeys.forEach(key => {
    sortedGroupedData[key] = groupedData[key];
});
if (sortByField) {
    Object.keys(sortedGroupedData).forEach(key => {
        sortedGroupedData[key].sort((a, b) => {
            const valueA = a[sortByField];
            const valueB = b[sortByField];
            // console.log(valueA, valueB)

            // Compare by groupByField first
            if (valueA !== valueB) {
                // If they are different, return the comparison for the groupByField
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    return valueA - valueB; // Numeric comparison
                }
                return String(valueA).localeCompare(String(valueB)); // Lexicographical comparison
            }
            // console.log(valueA, valueB)
            // If the groupByField is the same, compare by sortByField (e.g., LastName)
            const sortValueA = a.LastName;
            const sortValueB = b.LastName;

            // Handle lexicographical sorting for the secondary field (e.g., LastName)
            return String(sortValueA).localeCompare(String(sortValueB));
        });
    });
} else {
    // If no sortByField is provided, just sort by LastName (default secondary sort)
        Object.keys(sortedGroupedData).forEach(key => {
            sortedGroupedData[key].sort((a, b) => {
                const valueA = a.LastName;
                const valueB = b.LastName;
    
                // Lexicographical sorting for LastName
                return String(valueA).localeCompare(String(valueB));
            });
        });
    
    }
    if(!originalFields.includes('LastName')) 
    {
        Object.keys(sortedGroupedData).forEach(key => {
            sortedGroupedData[key].forEach(item => {
                delete item.LastName;
            });
            
        });
    }




// console.log(sortedGroupedData);


    res.status(200).json({
        status: "success",
        reportData: sortedGroupedData,
    });

});


exports.campainPaymentsReport = asyncHandler(async (req, res, next) => {

    const reportData = req.body;
    const campainName = reportData.selectedCampain;

    if (!campainName) {
        return next(new AppError(400, "לא זוהה קמפיין"));
    }

    const selectedPaymentsFields = reportData.selectedFields.paymentsFields;
    // console.log(selectedCommitmentFields)
    const selectedAlfonFields = reportData.selectedFields.alfonFields;
    // const groupByField = reportData.groupByField;

    const sortByField = reportData.sortByField;
    // console.log(sortByField)
    const originalFields = selectedPaymentsFields.concat(selectedAlfonFields);
    if (originalFields.length === 0) {
        return next(new AppError(400,"חייב לבחור לפחות שדה אחד"));
    }
    // console.log(selectedAlfonFields)
    const allFields = selectedPaymentsFields
    .concat(selectedAlfonFields)
    .concat(['-_id', 'AnashIdentifier','LastName'])
    .join(' ');

    let payments = await paymentModel.find({ CampainName: campainName }).select(allFields).lean();
    console.log(payments)
    let campainPeople = await People.find({ Campaigns: { $in: [campainName] }}).select(allFields).lean();
    const campainPeopleMap = new Map(campainPeople.map(person => [person.AnashIdentifier, person]));
    const updatedData = payments.map((payment) => {
        const AnashIdentifier = payment.AnashIdentifier;
 
        // Update commitment for each campaign to compa    
  // Update commitment with person details
        const pesonAlfonDetails = campainPeopleMap.get(AnashIdentifier);
        if (pesonAlfonDetails) {
            // Return a new object combining the commitment and the person details
            return { ...payment, ...pesonAlfonDetails };
        }
  
        // Return the original commitment if no person details are found
        return payment;
    });
    // console.log(updatedData)


const isDate = function(date) {
    return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

if (sortByField) {
   updatedData.sort((a, b) => {
            const valueA = a[sortByField];
            const valueB = b[sortByField];
            // console.log(valueA, valueB)

            // Compare by groupByField first
            if (valueA !== valueB) {
                // If they are different, return the comparison for the groupByField
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    return valueA - valueB; // Numeric comparison
                }
                if(isDate(valueA) && isDate(valueB))
                {
                    return new Date(valueA) - new Date(valueB);
                }
                return String(valueA).localeCompare(String(valueB)); // Lexicographical comparison
            }
            const sortValueA = a.LastName;
            const sortValueB = b.LastName;

            // Handle lexicographical sorting for the secondary field (e.g., LastName)
            return String(sortValueA).localeCompare(String(sortValueB));
       
    });
} else {
    // If no sortByField is provided, just sort by LastName (default secondary sort)
            updatedData.sort((a, b) => {
                const valueA = a.LastName;
                const valueB = b.LastName;
    
                // Lexicographical sorting for LastName
                return String(valueA).localeCompare(String(valueB));
            });
    
    }

    const anashIncluded = originalFields.includes('AnashIdentifier');
    const dateIncluded = originalFields.includes('Date');
    const  lastNameIncluded = originalFields.includes('LastName');

    updatedData.forEach(key => {
        if(!anashIncluded) {
            delete key.AnashIdentifier;
        }
        if(!lastNameIncluded) {
            delete key.LastName;
        }

    });

    res.status(200).json({
        success: true,
        reportData: updatedData,
    });
            

}
)



exports.dateRangePaymentsReport = asyncHandler(async (req, res, next) => {

    const reportData = req.body;
    const dateRange = reportData.dateRange;

    if (!dateRange) {
        return next(new AppError(400, "לא סופק טווח תאריכים"));
    }
    if(!dateRange.startDate || !dateRange.endDate) {
        return next(new AppError(400, "לא סופק תאריך התחלה או תאריך סוף"));
    }
    if(dateRange.startDate > dateRange.endDate) {
        return next(new AppError(400, "תאריך התחלה גדול מתאריך סוף"));
    }

    const selectedPaymentsFields = reportData.selectedFields.paymentsFields;
    // console.log(selectedCommitmentFields)
    const selectedAlfonFields = reportData.selectedFields.alfonFields;
    // const groupByField = reportData.groupByField;

    const sortByField = reportData.sortByField;
    // console.log(sortByField)
    const originalFields = selectedPaymentsFields.concat(selectedAlfonFields);
    if (originalFields.length === 0) {
        return next(new AppError(400,"חייב לבחור לפחות שדה אחד"));
    }
    // console.log(selectedAlfonFields)
    const allFields = selectedPaymentsFields
    .concat(selectedAlfonFields)
    .concat(['-_id', 'AnashIdentifier','LastName'])
    .join(' ');

    let payments = await paymentModel.find({ Date: { $gte: dateRange.startDate, $lte: dateRange.endDate } }).select(allFields).lean();
    const anashArray = payments.map(payment => payment.AnashIdentifier);
    let paymentsPeople = await People.find({ AnashIdentifier: { $in: anashArray }}).select(allFields).lean();
    const anashPeopleMap = new Map(paymentsPeople.map(person => [person.AnashIdentifier, person]));

    const updatedData = payments.map((payment) => {
        const AnashIdentifier = payment.AnashIdentifier;
         const pesonAlfonDetails = anashPeopleMap.get(AnashIdentifier);
        if (pesonAlfonDetails) {
            // Return a new object combining the commitment and the person details
            return { ...payment, ...pesonAlfonDetails };
        }
  
        // Return the original commitment if no person details are found
        return payment;
    });
    // console.log(updatedData)


const isDate = function(date) {
    return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

if (sortByField) {
   updatedData.sort((a, b) => {
            const valueA = a[sortByField];
            const valueB = b[sortByField];
            // console.log(valueA, valueB)

            // Compare by groupByField first
            if (valueA !== valueB) {
                // If they are different, return the comparison for the groupByField
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    return valueA - valueB; // Numeric comparison
                }
                if(isDate(valueA) && isDate(valueB))
                {
                    return new Date(valueA) - new Date(valueB);
                }
                return String(valueA).localeCompare(String(valueB)); // Lexicographical comparison
            }
            const sortValueA = a.LastName;
            const sortValueB = b.LastName;

            // Handle lexicographical sorting for the secondary field (e.g., LastName)
            return String(sortValueA).localeCompare(String(sortValueB));
       
    });
} else {
    // If no sortByField is provided, just sort by LastName (default secondary sort)
            updatedData.sort((a, b) => {
                const valueA = a.LastName;
                const valueB = b.LastName;
    
                // Lexicographical sorting for LastName
                return String(valueA).localeCompare(String(valueB));
            });
    
    }

    const anashIncluded = originalFields.includes('AnashIdentifier');
    const dateIncluded = originalFields.includes('Date');
    const  lastNameIncluded = originalFields.includes('LastName');

    updatedData.forEach(key => {
        if(!anashIncluded) {
            delete key.AnashIdentifier;
        }
        if(!lastNameIncluded) {
            delete key.LastName;
        }

    });

    res.status(200).json({
        success: true,
        reportData: updatedData,
    });
            

}
)




    

    
  
  

    







