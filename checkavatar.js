require("dotenv").config();

async function fetchAvatars() {
  const fetch = await import("node-fetch");
  const HEYGEN_API_KEY = process.env.VITE_HEYGEN_API_KEY;

  if (!HEYGEN_API_KEY) {
    console.error("Please set the VITE_HEYGEN_API_KEY environment variable.");
    process.exit(1);
  }

  try {
    const response = await fetch.default("https://api.heygen.com/v1/avatars", {
      method: "GET",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch avatars: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Available Avatars:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error fetching avatars:", error.message);
  }
}

fetchAvatars();
