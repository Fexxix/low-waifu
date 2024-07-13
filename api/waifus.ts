import sharp from "sharp"
import axios from "axios"
import { connectToDatabase } from "./src/mongodb.js"
import WaifuModel from "./src/waifu-model.js"
import { config } from "dotenv"
import { UTApi } from "uploadthing/server"

config()

const WAIFU_API_URL = "https://api.waifu.im/search"
const TARGET_WIDTH = 400 // Adjust as needed
const QUALITY = 80

const utapi = new UTApi()

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
    return Response.json(
      { error: "Failed to connect to database" },
      { status: 500 }
    )
  }

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "20"

    // Fetch images from Waifu API
    const response = await axios.get(WAIFU_API_URL, {
      params: { limit, gif: false },
    })

    const images = response.data.images

    // Process images
    const processedImages = []
    for (const img of images) {
      const image = await WaifuModel.findOne({ url: img.url })

      if (image) {
        processedImages.push(image)
        continue
      }

      const imageResponse = await axios.get(img.url, {
        responseType: "arraybuffer",
      })
      const imageBuffer = Buffer.from(imageResponse.data)

      const resizedImage = await sharp(imageBuffer)
        .resize({ width: TARGET_WIDTH })
        .toBuffer({ resolveWithObject: true })

      let outputFormat: "jpeg" | "png" | "webp"
      if (
        resizedImage.info.format === "jpeg" ||
        resizedImage.info.format === "jpg"
      ) {
        outputFormat = "jpeg"
      } else if (resizedImage.info.format === "png") {
        outputFormat = "png"
      } else {
        outputFormat = "webp"
      }

      const optimizedImage = await sharp(resizedImage.data)
        [outputFormat]({ quality: QUALITY })
        .toBuffer()

      const aspectRatio = img.width / img.height
      const newHeight = Math.round(TARGET_WIDTH / aspectRatio)

      const uploadResult = await utapi.uploadFiles(
        new File([optimizedImage], img.url, {
          type: `image/${outputFormat}`,
        })
      )

      await WaifuModel.create({
        previewUrl:
          uploadResult.data?.url ??
          `data:image/${outputFormat};base64,${optimizedImage.toString(
            "base64"
          )}`,
        url: img.url,
        width: TARGET_WIDTH,
        height: newHeight,
        dominantColor: img.dominant_color,
      })

      processedImages.push({
        preview_url:
          uploadResult.data?.url ??
          `data:image/${outputFormat};base64,${optimizedImage.toString(
            "base64"
          )}`,
        width: TARGET_WIDTH,
        height: newHeight,
        dominant_color: img.dominant_color,
        url: img.url,
      })
    }

    return Response.json(processedImages, { headers })
  } catch (error) {
    console.error("Error processing images:", error)
    return Response.json(
      { error: "An error occurred while processing images" },
      { status: 500, headers }
    )
  }
}
