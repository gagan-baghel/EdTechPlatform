const express = require('express')
const app = express()

const userRoutes = require('./routes/userRoutes.js')
const profileRoutes = require('./routes/profileRoutes.js')
const paymentRoutes = require('./routes/paymentRoutes.js')
const courseRoutes = require('./routes/courseRoutes.js')
const contactUsRoute = require("./routes/Contact");
require('dotenv').config()

const {connectDB} = require('./config/connectDB')
const {cloudinaryConnect} = require('./config/cloudinary')


const fileUpload = require('express-fileupload')
const cors = require('cors')
const cookieParser = require('cookie-parser')


app.use(cookieParser())
app.use(express.json())
app.use(fileUpload({
    useTempFiles:true,
    tempFileDir:"/tmp",
}))
app.use(cors({
    origin: "*",
    credentials: true
}));

connectDB()
cloudinaryConnect()

const PORT = process.env.PORT || 4000



app.use("/api/v1/auth",userRoutes)
app.use("/api/v1/profile",profileRoutes)
app.use("/api/v1/course",courseRoutes)
app.use("/api/v1/payment",paymentRoutes)
app.use("/api/v1/reach", contactUsRoute);



app.listen(PORT,()=>{
    console.log("listening to port " + PORT)
})

app.get('/',(req,res)=>{
    res.status(200).json({
        success:true
    }).send("Welcome to home Route")
})


