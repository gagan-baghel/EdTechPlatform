import mongoose, { type Connection } from "mongoose"

import { getEnv } from "./env"

let connectionPromise: Promise<Connection> | null = null

export const connectDB = async (): Promise<Connection> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(getEnv().MONGODB_CONNECTION_URL, {
        // Index creation is owned by scripts/ensure-indexes.js, which
        // dedupes before building each unique index. With autoIndex on,
        // Mongoose attempts index creation on every cold start, and if
        // duplicates exist that rejection can crash the function instead of
        // just failing to build an index it wasn't going to enforce anyway.
        autoIndex: false,
      })
      .then((conn) => conn.connection)
      .catch((error: unknown) => {
        connectionPromise = null
        throw error
      })
  }

  return connectionPromise
}
