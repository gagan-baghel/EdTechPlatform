
const mongoose = require('mongoose')

require('dotenv').config()
  
exports.connectDB = async (req,res) => {

        mongoose.connect(process.env.MONGODB_CONNECTION_URL,{
            useNewUrlParser:true,
            useUnifiedTopology:true
        }).then(()=>{
            console.log("Mongodb Connected SuccessFully")
        }).catch((error)=>{
            console.error("something bad happened while connecting with mongodb /config",error)
            process.exit(1)
        })
        
} 
