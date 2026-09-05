// const axios = require("axios");

// async function getWeatherFromCloudify(lat, lon) {
//   const API_KEY = process.env.CLOUDIFY_API_KEY;
//   if (!API_KEY) throw new Error("Cloudify API key missing");

//   const url = `https://api.cloudifyweather.com/v1/current?lat=${lat}&lon=${lon}&key=${API_KEY}`;
//   const { data } = await axios.get(url);

//   // Cloudify may have different response shapes; normalize defensively
//   const temp =
//     data?.current?.temp ?? data?.temp ?? data?.temperature ?? data?.data?.temp;
//   const humidity =
//     data?.current?.humidity ?? data?.humidity ?? data?.data?.humidity;
//   const description =
//     data?.current?.weather?.[0]?.description ??
//     data?.weather_desc ??
//     (Array.isArray(data?.weather) ? data.weather[0]?.description : undefined);

//   return {
//     temperature: temp,
//     humidity,
//     description,
//     raw: data, // include raw data for debugging if needed
//   };
// }

// module.exports = { getWeatherFromCloudify };
const axios = require("axios");

async function getWeatherFromCloudify(lat, lon) {
  const API_KEY = process.env.CLOUDIFY_API_KEY;
  if (!API_KEY) throw new Error("Cloudify API key missing");

  const url = `https://api.cloudifyweather.com/v1/current?lat=${lat}&lon=${lon}&key=${API_KEY}`;
  const { data } = await axios.get(url);

  return {
    temperature: data?.current?.temp ?? data?.temp,
    humidity: data?.current?.humidity ?? data?.humidity,
    description: data?.current?.weather?.[0]?.description ?? "Unknown",
  };
}

module.exports = { getWeatherFromCloudify };
