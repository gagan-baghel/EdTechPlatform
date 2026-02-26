
const mongoose = require('mongoose')

require('dotenv').config()

let connectionPromise = null

exports.connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_CONNECTION_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then((conn) => {
        console.log("Mongodb Connected SuccessFully")
        return conn
      })
      .catch((error) => {
        connectionPromise = null
        console.error(
          "something bad happened while connecting with mongodb /config",
          error
        )
        throw error
      })
  }

  return connectionPromise
}
