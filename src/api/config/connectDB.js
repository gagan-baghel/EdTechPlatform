
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
        // Index creation is owned by scripts/ensure-indexes.js, which
        // dedupes before building each unique index. With autoIndex on,
        // Mongoose attempts index creation on every cold start, and if
        // duplicates exist that rejection can crash the function instead of
        // just failing to build an index it wasn't going to enforce anyway.
        autoIndex: false,
      })
      .then((conn) => conn)
      .catch((error) => {
        connectionPromise = null
        throw error
      })
  }

  return connectionPromise
}
