const express = require('express');
const app = express();
const cors = require('cors')


require('dotenv').config();
const corsOptions = {
  origin:true,
  credentials:true
}
app.use(cors(corsOptions))

const mongoose = require('mongoose');

// const globalErrorHandler = require('./utils/errorHandler')
// const cookieParser = require('cookie-parser');
app.use(express.json())

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


const connectDB = async (url)=>{
  try{
    await mongoose.connect(url)
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

  
