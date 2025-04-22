
// ——— CONFIG: paste your real key here (demo only!) ———
const OPENAI_KEY   = "sk-T7i891Hr5GxIpcfRyIMqajXPsohraHNfKBvRqYJyCZT3BlbkFJYYScQn_qgjcsBKWKcwSqqHNcaI72z7slZleJwVWjYA";
const STYLE_REF_URL = "https://farrukmurad.github.io/image-styler/style-ref.png";

// DOM refs
const fileInput    = document.getElementById("fileInput");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// Convert File → PNG Blob (512×512)
async function fileToPngBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 512;
      cvs.height = 512;
      const c = cvs.getContext("2d");
      c.drawImage(img, 0, 0, 512, 512);
      cvs.toBlob(b => resolve(b), "image/png");
    };
    img.onerror = () => reject("Image load failed");
    img.src = URL.createObjectURL(file);
  });
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Select a photo first!");

  let blob;
  try {
    blob = await fileToPngBlob(file);
  } catch (e) {
    return alert("Failed to process image: " + e);
  }

  // Build FormData
  const form = new FormData();
  form.append("image", blob, "user.png");
  form.append("mask",  blob, "mask.png");
  form.append("prompt",
    `Please repaint this image to match exactly the style of this reference: ${STYLE_REF_URL}`
  );
  form.append("n",    "1");
  form.append("size", "512x512");

  // Call OpenAI directly
  let res, json;
  try {
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    json = await res.json();
    if (!res.ok) throw json;
  } catch (err) {
    console.error(err);
    return alert("API error:\n" + (err.error?.message || JSON.stringify(err)));
  }

  // Draw result over style-ref.png background
  const aiUrl = json.data[0].url;
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
      // Center AI result
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

