

// ——— CONFIG ———
// 1) Your Worker URL from Cloudflare:
const PROXY_URL = "https://image-styler-proxy.murodovfarrukh.workers.dev/";
// 2) Your public style-ref.png:
const STYLE_REF_URL =
  "https://farrukmurad.github.io/image-styler/style-ref.png";


// DOM elements
const fileInput    = document.getElementById("fileInput");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// ——— Helper (resizes & converts to PNG blob) ———
async function fileToPngBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width  = 512;
      cvs.height = 512;
      cvs.getContext("2d").drawImage(img, 0, 0, 512, 512);
      cvs.toBlob(blob => resolve(blob), "image/png");
    };
    img.onerror = () => reject("Image load failed");
    img.src = URL.createObjectURL(file);
  });
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please select a photo");

  // 1) Convert to 512×512 PNG
  let pngBlob;
  try {
    pngBlob = await fileToPngBlob(file);
  } catch (e) {
    return alert("Conversion failed: " + e);
  }

  // (Optional) preview what you're sending:
  const preview = document.getElementById("previewImg");
  if (preview) {
    preview.src = URL.createObjectURL(pngBlob);
    preview.style.display = "block";
  }

  // 2) Build a fully‑transparent mask
  const maskBlob = await new Promise(res => {
    const empty = document.createElement("canvas");
    empty.width  = 512;
    empty.height = 512;
    empty.toBlob(res, "image/png");  // transparent by default
  });

  // 3) Prepare multipart form
  const form = new FormData();
  form.append("image", pngBlob, "user.png");
  form.append("mask",  maskBlob, "mask.png");
  form.append(
    "prompt",
    `Please repaint this photo to match exactly the style of this reference image: ${STYLE_REF_URL}`
  );
  form.append("n",    "1");
  form.append("size", "512x512");

  // 4) Call the API
  let resp, json;
  try {
    resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    json = await resp.json();
    if (!resp.ok) throw json;
  } catch (err) {
    console.error("OpenAI error:", err);
    // Display whichever message is present:
    const msg = err.error?.message       // nested error object?
               ?? err.message           // top‐level message?
               ?? JSON.stringify(err);  // fall back to full JSON
    return alert("Styling failed:\n" + msg);
  }

  // 5) Hide preview
  if (preview) preview.style.display = "none";

  // 6) Composite over your background
  const aiUrl = json.data[0].url;
  const aiImg = new Image();
  aiImg.crossOrigin = "anonymous";
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = STYLE_REF_URL;
    bg.onload = () => {
      // a) fit canvas to background
      resultCanvas.width  = bg.width;
      resultCanvas.height = bg.height;
      ctx.drawImage(bg, 0, 0);

      // b) center the AI image
      const x = (bg.width  - 512) / 2;
      const y = (bg.height - 512) / 2;
      ctx.drawImage(aiImg, x, y, 512, 512);

      // c) show download link
      resultCanvas.style.display = "block";
      downloadBtn.style.display  = "inline-block";
      downloadBtn.href           = resultCanvas.toDataURL("image/png");

      // d) add to gallery
      const thumb = document.createElement("img");
      thumb.src = resultCanvas.toDataURL("image/png");
      gallery.prepend(thumb);
    };
  };
});


