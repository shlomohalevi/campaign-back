const asyncHandler = require('express-async-handler')
const AppError = require('../utils/AppError')
const mongoose = require('mongoose')
const managerModel = require('../models/managersModel')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');

const generateToken = (id,username,expiresIn) => {
    return jwt.sign({ id, username }, process.env.JWT_SECRET, {
        expiresIn: expiresIn
    })
}



exports.register = asyncHandler(async (req, res, next) => {
    const { username, password ,role,email,fullName} = req.body;

    if (!username || !password) {
        return next(new AppError(400, 'Please provide username and password'));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);



    const user = await managerModel.create({
        Username: username,
        Password: hashedPassword,
        Role: role,
        Email: email,
        FullName: fullName

    });

    if (!user) {
        return next(new AppError(400, 'Please provide email and password'));
    }
    // const token = generateToken(user._id, user.Username, '3h');

    // res.cookie('token', token, {
    //     httpOnly: true,        
    //     secure: true,
    // });
    
    res.status(201).json({
        status: 'success',
        message: 'Token set in cookie',
        user

    });
    
})


exports.login = asyncHandler(async (req, res, next) => {
    console.log(req.body);
    const { username, password } = req.body;
    // console.log(typeof password);
    if (!username || !password) {
        return next(new AppError(400, 'Please provide username and password'));
    }

    const user = await managerModel.findOne({ Username: username });
    // const h = await bcrypt.hash(password, 10);


    if (!user || !(await bcrypt.compare(password, user.Password))) {
        return next(new AppError(401, 'Incorrect username or password'));
    }
    const token = generateToken(user._id, user.Username, '3d');

    // Set the token as an HTTP-only cookie
    res.cookie('token', token, {
        httpOnly: true,        // Prevents JavaScript access
        secure: process.env.NODE_ENV === 'production', // Secure only in full HTTPS
        // sameSite: 'none'
    });
    
    res.status(201).json({
        status: 'success',
        message: 'Token set in cookie',
        user
    });
    
})
exports.logout = asyncHandler(async (req, res, next) => {
    console.log(req.cookies);

    if (!req.cookies.token) {
        return next(new AppError(401, 'You are not logged in! Please log in to get access.'));
    }
    res.clearCookie('token');
    res.status(200).json({
        status: 'success',
        message: 'Token cleared'
    })


})



exports.protect = asyncHandler(async (req, res, next) => {
    let token;
    
    // Check for the token in cookies
    if (req.cookies.token) {
        token = req.cookies.token;
    }

    // If no token is found, return an error
    if (!token) {
        return next(new AppError(401, 'You are not logged in! Please log in to get access.'));
    }

    // Verify the token
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return next(new AppError(401, 'Invalid token. Please log in again.'));
    }

    // Check if the decoded token has a valid user ID
    if (!decoded || !decoded.id) {
        return next(new AppError(401, 'The user belonging to this token does no longer exist.'));
    }

    // Check if the user still exists
    const currentUser = await managerModel.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError(401, 'The user belonging to this token does no longer exist.'));
    }
    // console.log('decoded');

    // Attach the current user to the request object
    req.user = currentUser;
    next();
});


exports.restrictTo = (roles) => {
    // console.log(roles);
    return (req, res, next) => {
        console.log(req.user);
        if (!roles.includes(req.user.Role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    }
}
exports.getAllUsers = asyncHandler(async (req, res, next) => 
    {
        const users = await managerModel.find({Role: 'User'});
        res.status(200).json({
            status: 'success',
            users
        })
    })

    exports.DeleteUser = asyncHandler(async (req, res, next) => 
    {
        const user = await managerModel.findByIdAndDelete(req.params.id)
        if(!user) {
            return next(new AppError('User not found', 404))
            }
        res.status(200).json({
            status:'success',
        })
    })


    exports.forgotPassword = asyncHandler(async (req, res, next) => {
        const { username, email } = req.body;
    
        if (!username || !email) {
            return next(new AppError('Please provide username and email', 400));
        }
    
        const user = await managerModel.findOne({ Username: username, Email: email });
        if (!user) {
            return next(new AppError('There is no user with that username.', 404));
        }
    
        const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
        try {
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 3600000;
            await user.save();
            console.log(user);
        } catch (error) {
            return next(new AppError('Failed to save reset token', 500));
        }
    
        const isDevelopment = process.env.NODE_ENV == 'development';
        console.log(isDevelopment);
        const transporter = nodemailer.createTransport(
            
            {
                service: 'Gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.EMAIL_PASSWORD
                },
                tls: isDevelopment ? { rejectUnauthorized: false } : undefined // Use default settings in production

            
            });


    
        const mailOptions = {
            to: email,
            from: process.env.EMAIL,
            subject: 'Password Reset Request',
            text: `You are receiving this because you have requested the reset of the password for your account.\n\n
                Please click on the following link, or paste this into your browser to complete the process:\n\n
                ${process.env.FRONTEND_BASE_URL}/reset-password/${resetToken}\n\n
                If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };
    
        transporter.sendMail(mailOptions, async (err, response) => {
            if (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save(); // Ensure the reset fields are cleared in case of email failure
                return res.status(500).json({ message: "Error sending email" , error: err});
            }
            res.status(200).json({ message: "Password reset email sent" });
        });
    });

    exports.resetPassword = asyncHandler(async (req, res, next) => {
        console.log('e');
            console.log(req.params);
        const { resetToken } = req.params;
        const { password } = req.body;
        console.log(resetToken);
        if(!password) {
            return next(new AppError('Please provide password', 400));
        }
    
        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (err) {
            return next(new AppError(401, 'Invalid token. Please log in again.'));
        }
    
        // Check if the decoded token has a valid user ID
        if (!decoded || !decoded.id) {
            return next(new AppError(401, 'The user belonging to this token does no longer exist.'));
        }
    
        // Check if the user still exists
        const user = await managerModel.findById(decoded.id);
        if (!user) {
            return next(new AppError(401, 'The user belonging to this token does no longer exist.'));
        }
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
        console.log(hashedPassword);

        // Update the user's password and remove the reset token
        user.Password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
    
        res.status(200).json({
            status: 'success',
            message: 'Password reset successful'
        });
    });


    exports.updateManagerDetails = asyncHandler(async (req, res, next) => {
        const manager = await managerModel.findById(req.body._id);
        
        
        if (!manager) {
            return next(new AppError('Manager not found', 404));
        }
    
        
        if (req.body.Password && req.body.Password.trim()) {
            const hashedPassword = await bcrypt.hash(req.body.Password, 10);
            req.body.Password = hashedPassword;
        } else {
            delete req.body.Password;
        }
            
        const updatedManager = await managerModel.findByIdAndUpdate(
            manager._id,
            { $set: req.body },
            {
                new: true,
                runValidators: true
            }
        );
    
        res.status(200).json({
            status: 'success',
            updatedManager
        });
    });
             