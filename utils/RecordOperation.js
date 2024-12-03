const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const peopleModel = require('../models/peopleModel')







exports.recordEditOperation = (operation) => {
    const { NewValues, OldValues, Date, OperationType, UserFullName, Desc } = operation;
    const newOperation = {
      Date,
      OperationType,
      UserFullName,
      Data: { OldValue: {}, NewValue: {} },
      Desc,
    };
  
    for (const [key, value] of Object.entries(NewValues)) {
      if (!Array.isArray(value)) {
        compareNonArrayValues(key, value, OldValues, newOperation);
      } else if (key === 'MemorialDays') {
        compareArrayValues(key, value, OldValues, newOperation);
      }
    }
  
    return Object.keys(newOperation.Data.NewValue).length === 0 ? null : newOperation;
  };
  

function compareNonArrayValues(key, value, oldValues, newOperation) {
    if (oldValues[key] != value) {
      newOperation.Data.NewValue[key] = value;
      newOperation.Data.OldValue[key] = oldValues[key];
    }
  }
  
  function compareArrayValues(key, value, oldValues, newOperation) {
    if (value.length !== oldValues[key].length) {
      newOperation.Data.NewValue[key] = value;
      newOperation.Data.OldValue[key] = oldValues[key];
    } else {
      for (let i = 0; i < value.length; i++) {
        if (!isTheSameDate(new Date(value[i].date), new Date(oldValues[key][i].date))) {
          newOperation.Data.NewValue[key] = value;
          newOperation.Data.OldValue[key] = oldValues[key];
          break;
        }
      }
    }
  }
  
function isTheSameDate(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
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



            
            



