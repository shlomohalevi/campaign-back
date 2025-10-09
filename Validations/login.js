const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string()
    .min(2)
    .max(60)
    .required()
    .messages({
      'string.empty': 'שם המשתמש הוא שדה חובה',
      'string.min': 'שם המשתמש חייב להכיל לפחות 2 תווים',
      'any.required': 'חובה להזין שם משתמש'
    }),

  password: Joi.string()
    .min(4)
    .required()
    .messages({
      'string.empty': 'סיסמה היא שדה חובה',
      'string.min': 'הסיסמה חייבת להיות לפחות 4 תווים',
      'any.required': 'חובה להזין סיסמה'
    })
});

module.exports = loginSchema;