class AppError extends Error{
    constructor(code, message){
        // console.log(code, message)
        // console.log( 'code', code)
        // console.log(    'message', message)
        super(message)
        this.code = code
    }
}

module.exports = AppError