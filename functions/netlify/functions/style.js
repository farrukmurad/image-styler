// functions/style.js
import OpenAI from "openai";

export const handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" })
    };
  }

  const imgBuffer = Buffer.from(payload.imageBase64, "base64");
  try {
    const response = await openai.images.edits.create({
      image: imgBuffer,
      mask:  imgBuffer,
      prompt: `Please repaint this photo to match exactly the style of this reference image: https://<YOUR-USERNAME>.github.io/image-styler/style-ref.png`,
      n: 1,
      size: "512x512",
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: response.data[0].url })
    };
  } catch (err) {
    console.error("OpenAI error:", err);
    return {
      statusCode: err.status || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
