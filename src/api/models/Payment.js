const mongoose = require('mongoose')

const paymentSchema = new  mongoose.Schema({

    consumer:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
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

// Payments.js upserts on this exact pair from both the client callback and
// the webhook backfill — without a unique index backing it, that upsert is
// not race-safe. See scripts/ensure-indexes.js; autoIndex is off (connectDB.js).
paymentSchema.index({ orderId: 1, consumer: 1 }, { unique: true })

module.exports = mongoose.models.Payment || mongoose.model("Payment",paymentSchema)
