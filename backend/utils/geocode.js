const axios = require("axios");

async function geocodeAddress(address) {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "jsonv2",
          limit: 1,
        },
        headers: {
          "User-Agent": "SmartMessManagementSystem/1.0",
        },
      }
    );

    if (!response.data.length) {
      return null;
    }

    return {
      lat: Number(response.data[0].lat),
      lng: Number(response.data[0].lon),
    };
  } catch (error) {
    console.error("Geocoding Error:", error.message);
    return null;
  }
}

module.exports = geocodeAddress;