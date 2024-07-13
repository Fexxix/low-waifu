import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  )
}

interface MongooseCache {
  conn: mongoose.Connection | null
  promise: Promise<mongoose.Connection> | null
}

declare global {
  var mongoose: MongooseCache
}

/**
 * Global is used here to maintain a cached connection
 * across hot reloads in development. This prevents
 * connections growing exponentially during API Route usage.
 */
global.mongoose = global.mongoose || { conn: null, promise: null }

async function connectToDatabase() {
  if (global.mongoose.conn) {
    console.log("Reusing existing database connection")
    return global.mongoose.conn
  }

  if (!global.mongoose.promise) {
    console.log("Creating new database connection")

    global.mongoose.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose.connection
    })
  }

  global.mongoose.conn = await global.mongoose.promise
  console.log("New database connection established")
  return global.mongoose.conn
}

export { connectToDatabase }
