

// ——— CONFIG ———
// 1) Your Worker URL from Cloudflare:
const PROXY_URL = "https://image-styler-proxy.murodovfarrukh.workers.dev/";
// 2) Your public style-ref.png:
const STYLE_REF_URL =
  "https://farrukmurad.github.io/image-styler/style-ref.png";


// DOM refs
const fileInput    = document.getElementById("fileInput");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// Convert File → base64‑PNG
function fileToBase64Png(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width  = 512;
        cvs.height = 512;
        cvs.getContext("2d").drawImage(img, 0, 0, 512, 512);
        cvs.toBlob(blob => {
          const r = new FileReader();
          r.onload = () => resolve(r.result.split(",")[1]);
          r.readAsDataURL(blob);
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
  if (!file) return alert("Please select a photo");

  let base64;
  try {
    base64 = await fileToBase64Png(file);
  } catch (e) {
    return alert("Conversion failed: " + e);
  }

  // 1) send to your Worker proxy
  let resp, data;
  try {
    resp = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64 })
    });
    const text = await resp.text();
    data = text ? JSON.parse(text) : {};
    if (!resp.ok) throw data;
  } catch (err) {
    console.error("Proxy error:", err);
    const msg = err.error
      ? (typeof err.error === "string"
         ? err.error
         : JSON.stringify(err.error, null, 2))
      : JSON.stringify(err, null, 2);
    return alert("Styling failed:\n" + msg);
  }  // ← **This closes the catch block**!

  // 2) Composite over your background
  const aiUrl = data.url;
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
