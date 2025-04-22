// netlify/functions/style.js
import fetch from "node-fetch";         // Polyfill for fetch in Netlify
import { OpenAI } from "openai";

// 1) Initialize the OpenAI client with your secret key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { imageBase64 } = body;
  if (!imageBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: "No imageBase64" }) };
  }

  // 2) Decode the user’s image
  const imageBuffer = Buffer.from(imageBase64, "base64");

  // 3) Build a fully transparent 512×512 PNG mask in code:
  const TRANSPARENT_PNG_BASE64 = 
    "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAADDED8xAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0" +
    "d2FyZQBQYWludC5ORVQgdjMuNS4xMFpW2gAAAAlwSFlzAAAOwwAADsMBx2+oZAAABeRJREFUeJzt3Qm" +
    "OwzAUBdC//+1u0zTSBSlpjuHMmHv8t6ydUcMoKAooCgihFbb7z+L8/0e5+3+9u3btv/tRnxdAiAiCIAi" +
    "CIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAi" +
    "CIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIC" +
    "AiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCID4X+Az5N+bcCmYIAAAAASUVORK5CYII=";
  const maskBuffer = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");

  try {
    // 4) Call the Edits API using the official SDK
    const response = await openai.images.edits.create({
      model:           "dall-e-3",        // or "dall-e-2"
      image:           imageBuffer,
      mask:            maskBuffer,
      prompt:          "Create a 3D sculptural bust in vivid cyan‑blue marble style: smooth surfaces, dramatic soft shadows, modern pop‑art finish.",
      n:               1,
      size:            "512x512",
      response_format: "url"
    });

    return {
      statusCode: 200,
      body:       JSON.stringify(response)
    };

  } catch (err) {
    console.error("OpenAI edit error", err);
    return {
      statusCode: err.status || 500,
      body:       JSON.stringify({ error: err.message || err.toString() })
    };
  }
};
