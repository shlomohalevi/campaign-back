const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('../Models/peopleModel')







exports.recordEditOperation =  (operation) => {
    const newValue = operation.NewValue
    const oldValue = operation.OldValue
    const newOperation = {
        Date: operation.Date,
        OperationType: operation.OperationType,
        UserFullName: operation.UserFullName,
        OldValue: {},
        NewValue: {}
        }
    for (const [key, value] of Object.entries(newValue)) {
        if(oldValue[key] !== value) {
            newOperation.NewValue[key] = value
            newOperation.OldValue[key] = oldValue[key]
        }
    }
    if(Object.keys(newOperation.NewValue).length  === 0) {
        return null
    }

    else{
        return newOperation
    }
}

exports.recordDeleteOperation =  (operation) => {
    const newOperation = {
        Date: operation.Date,
        OperationType: operation.OperationType,
        UserFullName: operation.UserFullName,
        OldValue: operation.OldValue
        }
    return newOperation
}
exports.recordNewCommitmentOperation =  (operation) => {
    const newOperation = {
        Date: operation.Date,
        OperationType: operation.OperationType,
        UserFullName: operation.UserFullName,
        NewValue: operation.NewValue
        }
    return newOperation
}

exports.recordNewPaymentOperation =  (operation) => {
    const newOperation = {
        Date: operation.Date,
        OperationType: operation.OperationType,
        UserFullName: operation.UserFullName,
        NewValue: operation.NewValue
        }
    return newOperation
}



            
            



