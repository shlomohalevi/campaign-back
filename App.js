const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors')
const uploadsRouter = require('./Routes/uploadRouts')
const commitmentRoute = require('./Routes/commitmentRoute')
const campainRoute = require('./Routes/campainsRoute')
const transactionRoute = require('./Routes/transactionRoute')
const globalErrorHandler = require('./utils/GlobalErrorHandler')
const authRoute = require('./Routes/AuthRoute')
const cookieParser = require("cookie-parser");


require('dotenv').config();
const corsOptions = {
  origin:true,
  credentials:true
}
app.use(cors(corsOptions))


// const globalErrorHandler = require('./utils/errorHandler')
// const cookieParser = require('cookie-parser');
app.use(express.json())
app.use(cookieParser())

app.use('/api/alfon', uploadsRouter);
app.use('/api/commitment', commitmentRoute);
app.use('/api/payment', commitmentRoute);
app.use('/api/campain', campainRoute);
app.use('/api/transaction', transactionRoute);
app.use('/api/auth', authRoute);


const port = 4000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
  app.all('*', (req, res) => {
    //change
    res.status(404).json({
        status: 'fail',
        message: 'The requested route is not exist on this server'
    })
})
app.use(globalErrorHandler)



const connectDB = async (url)=>{
  try{
    await mongoose.connect(url);
    console.log(`Connected to database: ${mongoose.connection.name}`);
  }
  catch(err){
    console.log(err.message)
  }
  
}
connectDB(process.env.MONGO_ATLAS)
.then(()=>{
  console.log("The data base has been connected");
})
.catch(err=> console.log(err.message))
module.exports = app 

  
