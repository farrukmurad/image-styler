// functions/style.js
import OpenAI from "openai";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Initialize with your key in Netlify env
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Parse client payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const imgBuffer = Buffer.from(payload.imageBase64, "base64");

  try {
    const response = await openai.images.edits.create({
      image: imgBuffer,
      mask:  imgBuffer,  
      prompt: `Please repaint this photo to match exactly the style of this reference image: https://github.com/farrukmurad/image-styler/style-ref.png`,
      n: 1,
      size: "512x512",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: response.data[0].url })
    };
  } catch (err) {
    console.error("OpenAI error:", err);
    return {
      statusCode: err.status || 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
