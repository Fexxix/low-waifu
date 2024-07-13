import axios from "axios"
import pLimit from "p-limit"

// Function to fetch waifus
const fetchWaifus = async (limit: number) => {
  const response = await axios.get(
    `https://low-waifu.vercel.app/api/waifus?limit=${limit}`
  )
  return response.data
}

// Limit concurrency to 10 requests at a time
const limit = pLimit(10)

// Create an array of 100 requests
const requests = Array.from({ length: 1000 }, (_, i) =>
  limit(() => fetchWaifus(30))
)

// Execute all requests
// setInterval(() => {
Promise.all(requests)
  .then((results) => {
    console.log("All requests completed", results)
  })
  .catch((error) => {
    console.error("Error with requests", error)
  })
// }, 90000)
