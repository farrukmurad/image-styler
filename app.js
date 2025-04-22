// ———— CONFIG ————
const OPENAI_KEY = "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";  
const STYLE_BG_URL = 
  "https://farrukmurad.github.io/image-styler/style-ref.png";



// Desired resolution for both image & mask
const TARGET_SIZE = 512;

// ——— DOM REFERENCES ———
const fileInput    = document.getElementById("fileInput");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// ——— HELPER: load a File into an <img> element ———
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => reject("Image load failed");
    img.src     = URL.createObjectURL(file);
  });
}

// ——— HELPER: draw an <img> into a square canvas of TARGET_SIZE ———
function drawToSquareCanvas(img) {
  const cvs = document.createElement("canvas");
  cvs.width  = TARGET_SIZE;
  cvs.height = TARGET_SIZE;
  const c = cvs.getContext("2d");
  // Fill background white to avoid transparency issues
  c.fillStyle = "white";
  c.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
  // Draw the image, covering the full square
  c.drawImage(img, 0, 0, TARGET_SIZE, TARGET_SIZE);
  return cvs;
}

// ——— MAIN FLOW ———
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please select a photo");

  let img;
  try {
    img = await loadImage(file);
  } catch (e) {
    return alert("Failed to load image: " + e);
  }

  // 1) Create a 512×512 PNG blob of the user photo
  const squareCanvas = drawToSquareCanvas(img);
  const pngBlob = await new Promise(res =>
    squareCanvas.toBlob(res, "image/png")
  );

  // 2) Build multipart form for OpenAI
  const form = new FormData();
  form.append("image", pngBlob, "user.png");
  form.append("mask",  pngBlob, "mask.png");   // full-area mask
  form.append(
    "prompt",
    `Please repaint this photo to match exactly the style of this reference image: ${STYLE_BG_URL}`
  );
  form.append("n",    "1");
  form.append("size", "512x512");

  // 3) POST request (must be POST!)
  let resp, json;
  try {
    resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    const text = await resp.text();
    json = JSON.parse(text);
    if (!resp.ok) throw json;
  } catch (err) {
    console.error("OpenAI error payload:", err);
    const msg = err.error?.message || JSON.stringify(err);
    return alert("AI styling failed:\n" + msg);
  }

  // 4) Composite AI result over your style-ref background
  const aiUrl = json.data[0].url;
  const aiImg = new Image();
  aiImg.crossOrigin = "anonymous";
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = STYLE_BG_URL;
    bg.onload = () => {
      // a) Resize canvas to background size
      resultCanvas.width  = bg.width;
      resultCanvas.height = bg.height;
      ctx.drawImage(bg, 0, 0);

      // b) Center AI image (512×512) over background
      const x = (bg.width  - TARGET_SIZE) / 2;
      const y = (bg.height - TARGET_SIZE) / 2;
      ctx.drawImage(aiImg, x, y, TARGET_SIZE, TARGET_SIZE);

      // c) Show download & update gallery
      resultCanvas.style.display = "block";
      downloadBtn.style.display  = "inline-block";
      downloadBtn.href           = resultCanvas.toDataURL("image/png");

      const thumb = document.createElement("img");
      thumb.src = resultCanvas.toDataURL("image/png");
      gallery.prepend(thumb);
    };
  };
});

