


// ——— CONFIG ———
// Your Cloudflare Worker proxy URL (no key here!)
const PROXY_URL = "https://image-styler-proxy.murodovfarrukh.workers.dev/";
// Your style-reference background
const STYLE_REF_URL =
  "https://farrukmurad.github.io/image-styler/style-ref.png";

// DOM refs
const fileInput    = document.getElementById("fileInput");
const previewImg   = document.getElementById("previewImg");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// helper: file → base64‐PNG
function fileToBase64Png(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width = 512; cvs.height = 512;
        cvs.getContext("2d").drawImage(img, 0, 0, 512, 512);
        cvs.toBlob(b => {
          const r = new FileReader();
          r.onload = () => resolve(r.result.split(",")[1]);
          r.readAsDataURL(b);
        }, "image/png");
      };
      img.onerror = () => reject("Image load failed");
      img.src = reader.result;
    };
    reader.onerror = () => reject("File read failed");
    reader.readAsDataURL(file);
  });
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Select a photo");

  // 1) Preview & convert to base64
  let b64;
  try {
    b64 = await fileToBase64Png(file);
    previewImg.src = "data:image/png;base64," + b64;
    previewImg.style.display = "block";
  } catch (e) {
    return alert("Preview failed: " + e);
  }

  // 2) send to your Worker
  let resp, data;
  try {
    resp = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: b64 })
    });
    data = await resp.json();
    if (!resp.ok) throw data;
  } catch (err) {
    console.error("Worker error:", err);
    return alert("Styling failed:\n" + (err.error || err.message || JSON.stringify(err)));
  }

  // 3) hide preview, show AI result
  previewImg.style.display = "none";

  const aiUrl = data.data?.[0]?.url || data.url;
  const aiImg = new Image();
  aiImg.crossOrigin = "anonymous";
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = STYLE_REF_URL;
    bg.onload = () => {
      resultCanvas.width  = bg.width;
      resultCanvas.height = bg.height;
      ctx.drawImage(bg, 0, 0);
      const x = (bg.width - 512) / 2;
      const y = (bg.height - 512) / 2;
      ctx.drawImage(aiImg, x, y, 512, 512);
      resultCanvas.style.display = "block";
      downloadBtn.style.display  = "inline-block";
      downloadBtn.href           = resultCanvas.toDataURL("image/png");
      const thumb = document.createElement("img");
      thumb.src = resultCanvas.toDataURL("image/png");
      gallery.prepend(thumb);
    };
  };
});
