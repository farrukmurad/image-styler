// ——— CONFIG ———
const FUNCTION_URL = "/.netlify/functions/style";  
const STYLE_BG_URL  = "https://farrukmurad.github.io/image-styler/style-ref.png";

// ——— DOM ———
const fileInput    = document.getElementById("fileInput");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// Convert selected file → base64‑encoded PNG
function fileToBase64Png(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width  = img.width;
        cvs.height = img.height;
        cvs.getContext("2d").drawImage(img, 0, 0);
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

  // 1) Send to Netlify Function
  let resp, data;
  try {
    resp = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64 })
    });
    data = await resp.json();
    if (!resp.ok) throw data;
  } catch (err) {
    console.error("Function error:", err);
    return alert("Styling failed:\n" + (err.error || err));
  }

  // 2) Composite result
  const aiUrl = data.url;
  const aiImg = new Image();
  aiImg.crossOrigin = "anonymous";
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = STYLE_BG_URL;
    bg.onload = () => {
      resultCanvas.width  = bg.width;
      resultCanvas.height = bg.height;
      ctx.drawImage(bg, 0, 0);
      const x = (bg.width - aiImg.width) / 2;
      const y = (bg.height - aiImg.height) / 2;
      ctx.drawImage(aiImg, x, y);

      resultCanvas.style.display = "block";
      downloadBtn.style.display  = "inline-block";
      downloadBtn.href           = resultCanvas.toDataURL("image/png");

      const thumb = document.createElement("img");
      thumb.src = resultCanvas.toDataURL("image/png");
      gallery.prepend(thumb);
    };
  };
});
