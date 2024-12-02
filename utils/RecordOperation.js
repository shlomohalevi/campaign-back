const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('../models/peopleModel')







exports.recordEditOperation =  (operation) => {
    const newValues = operation.NewValues
    const oldValues = operation.OldValues
    const newOperation = {
        Date: operation.Date,
        OperationType: operation.OperationType,
        UserFullName: operation.UserFullName,
        Data:{
            OldValue: {},
            NewValue: {}}
            ,
        Desc: operation.Desc
        }
    for (const [key, value] of Object.entries(newValues)) {
        if(oldValues[key] !=value) {
            newOperation.Data.NewValue[key] = value
            newOperation.Data.OldValue[key] = oldValues[key]
        }
    }
    if(Object.keys(newOperation.Data.NewValue).length  === 0) {
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
        Data: operation.Data,
        Desc: operation.Desc
        }
    return newOperation
}
exports.recordAddOperation =  (operation) => {
    const newOperation = {
        Date: operation.Date,
        OperationType: operation.OperationType,
        UserFullName: operation.UserFullName,
        Data: operation.Data,
        Desc: operation.Desc
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



            
            



