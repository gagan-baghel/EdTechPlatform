const mongoose = require('mongoose')

const paymentSchema = new  mongoose.Schema({

    consumer:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Profile"
    },

    courses:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Course"
    }],

    orderId:{
        type:String,
        required:true
    },

    paymentId:{
        type:String,
        required:true
    },


    amount:{
        type:Number,
        required:true
    },

    date:{
        type:Date,
        default:Date.now,
    }

})


module.exports = mongoose.model("payment",paymentSchema)