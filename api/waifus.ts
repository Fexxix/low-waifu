import sharp from "sharp"
import axios, { AxiosError } from "axios"

const WAIFU_API_URL = "https://api.waifu.im/search"
const TARGET_WIDTH = 400 // Adjust as needed
const QUALITY = 80

export async function GET(request: Request) {
  // CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  })

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "20"

    // Fetch images from Waifu API
    const response = await axios.get(WAIFU_API_URL, {
      params: { limit },
    })

    const images = response.data.images

    // Process images
    const processedImages = []
    for (const img of images) {
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

      processedImages.push({
        preview_url: `data:image/${outputFormat};base64,${optimizedImage.toString(
          "base64"
        )}`,
        width: TARGET_WIDTH,
        height: newHeight,
        url: img.url,
      })
    }

    return Response.json(processedImages, { headers })
  } catch (error) {
    console.error("Error processing images:", error as AxiosError)
    return Response.json(
      { error: "An error occurred while processing images" },
      { status: 500, headers }
    )
  }
}
