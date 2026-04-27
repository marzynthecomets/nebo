/*
 * ============================================================
 * NEBO — Star Scan Serverless Function
 * ============================================================
 *
 * Mars! This is the "vault door" for your API key.
 *
 * It lives on Netlify's servers, NOT in your frontend code.
 * The kid's browser calls this function, this function calls
 * AstronomyAPI with your secret key, and sends back the result.
 *
 * The kid never sees the key. It's stored in Netlify's
 * environment variables dashboard.
 *
 * SETUP:
 * 1. In your Netlify dashboard, go to Site Settings → Environment Variables
 * 2. Add two variables:
 *    - ASTRONOMY_APP_ID     = your Application ID
 *    - ASTRONOMY_APP_SECRET = your Application Secret
 * 3. Deploy. That's it!
 *
 * ENDPOINT: /.netlify/functions/star-scan?lat=40.71&lon=-74.01
 * RETURNS:  { imageUrl: "https://..." }
 * ============================================================
 */

// CORS headers added to every response so error details aren't hidden by
// CORS preflight rejection in the browser.
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

exports.handler = async function (event) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Grab params from query string
  const { lat, lon, constellation } = event.queryStringParameters || {};

  if (!lat || !lon) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing lat and lon parameters" }),
    };
  }

  // Default to Ursa Minor (Polaris) if no constellation passed.
  // The IDs match AstronomyAPI's IAU 3-letter codes ("ori", "cma", etc.)
  const constellationId = (constellation || "umi").toLowerCase();

  // Build the auth string from environment variables
  // AstronomyAPI uses Basic Auth: base64(appId:appSecret)
  const appId = process.env.ASTRONOMY_APP_ID;
  const appSecret = process.env.ASTRONOMY_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("Missing ASTRONOMY_APP_ID or ASTRONOMY_APP_SECRET env vars");
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  const authString = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  // Get today's date in the format AstronomyAPI expects
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // "2026-04-27"

  // Build the star chart request — view: "constellation" centers the chart
  // on whichever constellation Nebo picked, instead of always showing the
  // celestial north pole.
  const requestBody = {
    style: "default",
    observer: {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      date: dateStr,
    },
    view: {
      type: "constellation",
      parameters: {
        constellation: constellationId,
      },
    },
  };

  try {
    const response = await fetch(
      "https://api.astronomyapi.com/api/v2/studio/star-chart",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AstronomyAPI error:", response.status, errorText);
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "AstronomyAPI request failed",
          details: errorText,
        }),
      };
    }

    const data = await response.json();

    // AstronomyAPI returns { data: { imageUrl: "https://..." } }
    const imageUrl = data?.data?.imageUrl || "";

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ imageUrl }),
    };
  } catch (err) {
    console.error("Star scan error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
