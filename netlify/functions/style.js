// netlify/functions/style.js
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Use POST' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { imageBase64 } = body;
  if (!imageBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No imageBase64' }) };
  }

  // Decode user image
  const imgBuffer = Buffer.from(imageBase64, 'base64');

  // Fetch transparent mask
  const maskResp = await fetch(
    'https://farrukmurad.github.io/image-styler/transparent-mask.png'
  );
  if (!maskResp.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Cannot fetch mask' }) };
  }
  const maskBuffer = await maskResp.arrayBuffer();

  // Build form for OpenAI Edits
  const form = new FormData();
  form.append('image', imgBuffer, { filename: 'user.png', contentType: 'image/png' });
  form.append('mask', Buffer.from(maskBuffer), { filename: 'mask.png', contentType: 'image/png' });
  form.append('model', 'dall-e-3');
  form.append('prompt',
    'Create a 3D sculptural bust in vivid cyan-blue marble style: smooth surfaces, dramatic soft shadows, modern pop-art finish.'
  );
  form.append('n', '1');
  form.append('size', '512x512');
  form.append('response_format', 'url');

  // Call OpenAI
  const resp = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form
  });
  const json = await resp.json();

  return {
    statusCode: resp.status,
    body: JSON.stringify(json)
  };
};
