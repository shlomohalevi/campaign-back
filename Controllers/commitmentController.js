const asyncHandler = require('express-async-handler');
const commitmentsModel = require('./../Models/commitmentsModel'); 
exports.uploadCommitment = asyncHandler(async (req, res, next) => {
    console.log(req.body);
    await commitmentsModel.insertMany(req.body);
    const commitments = await commitmentsModel.find();
    res.status(200).json({
        status: 'success',
        commitments: commitments
    });
});