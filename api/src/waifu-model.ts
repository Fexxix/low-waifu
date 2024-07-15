// File: models/WaifuModel.ts

import mongoose, { Schema, Document } from "mongoose"

// Define interface for document in MongoDB
export interface WaifuDocument extends Document {
  previewUrl: string
  url: string
  previewHeight: number
  previewWidth: number
  width: number
  height: number
  dominantColor: string
}

// Define Mongoose schema for 'waifus' collection
const WaifuSchema: Schema<WaifuDocument> = new Schema({
  previewUrl: { type: String, required: true },
  url: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  previewHeight: { type: Number, required: true },
  previewWidth: { type: Number, required: true },
  dominantColor: { type: String, required: true },
})

WaifuSchema.index({ url: 1 })

// Compile and export model
const WaifuModel: mongoose.Model<WaifuDocument> =
  mongoose.models.Waifu || mongoose.model<WaifuDocument>("Waifu", WaifuSchema)
export default WaifuModel
