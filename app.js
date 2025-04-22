// ———— CONFIG ————
const OPENAI_KEY = "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";  
const STYLE_BG_URL = 
  "https://farrukmurad.github.io/image-styler/style-ref.png";



// ——— DOM REFERENCES ———
const fileInput    = document.getElementById("fileInput");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// ——— HELPERS ———
// Convert any selected file (JPEG/PNG) into a valid PNG blob:
function fileToPngBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width  = img.naturalWidth;
      cvs.height = img.naturalHeight;
      const c = cvs.getContext("2d");
      c.drawImage(img, 0, 0);
      cvs.toBlob(blob => resolve(blob), "image/png");
    };
    img.onerror = () => reject("Image load failed");
    img.src = URL.createObjectURL(file);
  });
}

// ——— MAIN FLOW ———
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please select a photo");

  // 1) Ensure it's a PNG for both image + mask:
  let pngBlob;
  try {
    pngBlob = await fileToPngBlob(file);
  } catch (e) {
    return alert("Failed to process image: " + e);
  }

  // 2) Build the multipart form for OpenAI
  const form = new FormData();
  form.append("image", pngBlob, "user.png");
  form.append("mask",  pngBlob, "mask.png");  
  form.append(
    "prompt",
    `Please repaint this photo to match exactly the style of this reference image: ${STYLE_BG_URL}`
  );
  form.append("n",    "1");
  form.append("size", "512x512");

  // 3) POST to the edits endpoint
  let resp, json;
  try {
    resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",                             // <— must be POST
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    const text = await resp.text();
    json = JSON.parse(text);
    if (!resp.ok) throw json;
  } catch (err) {
    console.error("OpenAI error:", err);
    const msg = err.error?.message || JSON.stringify(err);
    return alert("AI styling failed: " + msg);
  }

  // 4) Composite the AI result over your style-ref background
  const aiUrl = json.data[0].url;
  const aiImg = new Image();
  aiImg.crossOrigin = "anonymous";
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = STYLE_BG_URL;
    bg.onload = () => {
      // a) Resize canvas
      resultCanvas.width  = bg.width;
      resultCanvas.height = bg.height;
      ctx.drawImage(bg, 0, 0);
      // b) Center the AI image
      const x = (bg.width  - aiImg.width)  / 2;
      const y = (bg.height - aiImg.height) / 2;
      ctx.drawImage(aiImg, x, y);
      // c) Show download link
      resultCanvas.style.display = "block";
      downloadBtn.style.display  = "inline-block";
      downloadBtn.href = resultCanvas.toDataURL("image/png");
      // d) Add thumbnail to gallery
      const thumb = document.createElement("img");
      thumb.src = resultCanvas.toDataURL("image/png");
      gallery.prepend(thumb);
    };
  };
});
