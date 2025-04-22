


// ——— CONFIG ———
// Your Cloudflare Worker proxy URL (no key here!)
const PROXY_URL = "https://image-styler-proxy.murodovfarrukh.workers.dev/";
// Your style-reference background
const STYLE_REF_URL =
  "https://farrukmurad.github.io/image-styler/style-ref.png";


const fileInput    = document.getElementById("fileInput");
const previewImg   = document.getElementById("previewImg");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// convert file → base64‑PNG
function fileToBase64Png(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width  = 512;
        cvs.height = 512;
        cvs.getContext("2d").drawImage(img,0,0,512,512);
        cvs.toBlob(b => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.readAsDataURL(b);
        }, "image/png");
      };
      img.onerror = ()=> rej("Image load failed");
      img.src = reader.result;
    };
    reader.onerror = ()=> rej("File read failed");
    reader.readAsDataURL(file);
  });
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Select a photo");
  let b64;
  try {
    b64 = await fileToBase64Png(file);
    previewImg.src = "data:image/png;base64," + b64;
    previewImg.style.display = "block";
  } catch (e) {
    return alert("Preview failed: " + e);
  }

  let resp, data;
  try {
    resp = await fetch(PROXY_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ imageBase64: b64 })
    });
    data = await resp.json();
    if (!resp.ok) throw data;
  } catch(err) {
    console.error("Worker error:", err);
    const msg = err.error?.message || JSON.stringify(err);
    return alert("Styling failed:\n" + msg);
  }

  previewImg.style.display = "none";

  // Replicate returns a `urls.output[0]`
  const aiUrl = data.urls?.output?.[0];
  if (!aiUrl) {
    return alert("No output URL in response");
  }

  const aiImg = new Image();
  aiImg.crossOrigin = "anonymous";
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    // draw full‐size
    resultCanvas.width  = aiImg.width;
    resultCanvas.height = aiImg.height;
    ctx.drawImage(aiImg, 0, 0);

    resultCanvas.style.display = "block";
    downloadBtn.style.display  = "inline-block";
    downloadBtn.href           = resultCanvas.toDataURL("image/png");

    const thumb = document.createElement("img");
    thumb.src = resultCanvas.toDataURL("image/png");
    gallery.prepend(thumb);
  };
});

