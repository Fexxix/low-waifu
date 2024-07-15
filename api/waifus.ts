import { connectToDatabase } from "./src/mongodb.js"
import WaifuModel from "./src/waifu-model.js"
import sharp from "sharp"
import axios from "axios"

export async function GET(request: Request) {
  // CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  })

  try {
    await connectToDatabase()
  } catch (e) {
    console.error(e)
    return new Response(
      JSON.stringify({ error: "Failed to connect to database" }),
      { status: 500 }
    )
  }

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    // Fetch all waifus from the database
    const allWaifus = await WaifuModel.find({}).exec()

    // Track how many documents have been updated
    let updatedCount = 0

    // Iterate through each waifu
    for (const waifu of allWaifus) {
      // Check if the waifu needs to be updated
      if (
        !waifu.previewHeight ||
        !waifu.previewWidth ||
        !waifu.width ||
        !waifu.height
      ) {
        // Fetch the image from the URL
        const response = await axios.get(waifu.url, {
          responseType: "arraybuffer",
        })
        const imageBuffer = Buffer.from(response.data, "binary")
        const metadata = await sharp(imageBuffer).metadata()

        // Update the waifu document
        waifu.previewHeight = waifu.previewHeight || waifu.height
        waifu.previewWidth = waifu.previewWidth || waifu.width
        // @ts-ignore
        waifu.height = metadata.height
        // @ts-ignore
        waifu.width = metadata.width

        await WaifuModel.updateOne(
          { _id: waifu._id },
          {
            $set: {
              previewHeight: waifu.previewHeight,
              previewWidth: waifu.previewWidth,
              height: waifu.height,
              width: waifu.width,
            },
          }
        )

        updatedCount++

        // If we've updated 'limit' number of documents, break out of the loop
        if (updatedCount >= limit) {
          break
        }
      }
    }

    // Fetch updated waifus after all updates
    const updatedWaifus = await WaifuModel.find({}).limit(limit).exec()

    return new Response(JSON.stringify(updatedWaifus), { headers })
  } catch (error) {
    console.error("Error fetching or updating waifus", error)
    return new Response(
      JSON.stringify({
        error: "An error occurred while fetching or updating waifus",
      }),
      { status: 500, headers }
    )
  }
}
