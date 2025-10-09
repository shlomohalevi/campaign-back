
const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.base': 'שם המשתמש חייב להיות מחרוזת',
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
    }),
  
  role: Joi.string()
    .valid('Admin', 'Guest', 'User')
    .required()
    .messages({
      'any.only': 'התפקיד חייב להיות Admin, Guest או User',
      'any.required': 'חובה להזין תפקיד'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'האימייל שהוזן אינו תקין',
      'any.required': 'חובה להזין אימייל'
    }),

  fullName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'שם מלא הוא שדה חובה',
      'string.min': 'שם מלא חייב להיות לפחות 3 תווים',
      'any.required': 'חובה להזין שם מלא'
    })
});
