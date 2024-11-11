module.exports = (err, req, res ,next)=>{
    // console.log(err.code)
    // console.log(err.message)

    const code = err.code || 500
    // console.log(err)
    res.status(code).json({
        status:'fail',
        message:err.message,
        code:code

   })
}