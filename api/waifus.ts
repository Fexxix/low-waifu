import { connectToDatabase } from "./src/mongodb.js"
import WaifuModel from "./src/waifu-model.js"

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
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    const waifus = await WaifuModel.aggregate([{ $sample: { size: limit } }])

    return new Response(JSON.stringify(waifus), { headers })
  } catch (error) {
    console.error("Error fetching waifus", error)
    return Response.json(
      { error: "An error occurred while fetching waifus" },
      { status: 500, headers }
    )
  }
}
