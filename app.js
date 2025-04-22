// ———— CONFIG ————
const OPENAI_KEY = "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";  
const STYLE_BG_URL = 
  "https://farrukmurad.github.io/image-styler/style-ref.png";


// ——— DOM ELEMENTS ———
const fileInput    = document.getElementById("fileInput");
const imgToCrop    = document.getElementById("toCrop");
const cropBtn      = document.getElementById("cropBtn");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
let cropper;

// 1) Init Cropper.js on upload
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  imgToCrop.src = URL.createObjectURL(file);
  imgToCrop.style.display = "block";
  cropBtn.style.display = "inline-block";
  if (cropper) cropper.destroy();
  cropper = new Cropper(imgToCrop, {
    viewMode: 1,
    aspectRatio: 1,
    autoCropArea: 0.8
  });
});

// 2) Crop, send to OpenAI, composite, gallery
cropBtn.addEventListener("click", async () => {
  const canvas = cropper.getCroppedCanvas({ width:512, height:512 });
  canvas.toBlob(async blob => {
    // a) build form
    const form = new FormData();
    form.append("image", blob, "face.png");
    // b) build real PNG mask
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const mctx = maskCanvas.getContext("2d");
    mctx.fillStyle = "white";
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    const maskBlob = await new Promise(res =>
      maskCanvas.toBlob(res, "image/png")
    );
    form.append("mask", maskBlob, "mask.png");
    // c) prompt + size + n
    form.append("prompt",
      `Please repaint this photo to match exactly the style of this reference image: ${STYLE_BG_URL}`
    );
    form.append("n", "1");
    form.append("size", "512x512");

    // d) call OpenAI
    const resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    // ☝️ right here we’re about to parse the JSON

    // 3) DEBUG: dump the raw response body if it fails
    const text = await resp.text();
    let j;
    try {
      j = JSON.parse(text);
    } catch (err) {
      console.error("Non‑JSON error response:", text);
      alert("Styling failed:\n" + text);
      return;
    }
    if (!resp.ok) {
      console.error("OpenAI error payload:", j);
      alert("Styling failed:\n" + (j.error?.message || JSON.stringify(j)));
      return;
    }

    // e) now we know it succeeded, use j.data[0].url
    const aiUrl = j.data[0].url;
    const ctx = resultCanvas.getContext("2d");
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
        ctx.drawImage(bg, 0, 0, bg.width, bg.height);
        const x = (bg.width  - aiImg.width)  / 2;
        const y = (bg.height - aiImg.height) / 2;
        ctx.drawImage(aiImg, x, y);
        resultCanvas.style.display = "block";
        downloadBtn.style.display = "inline-block";
        downloadBtn.href = resultCanvas.toDataURL("image/png");
        const thumb = document.createElement("img");
        thumb.src = resultCanvas.toDataURL("image/png");
        gallery.prepend(thumb);
      };
    };
  }, "image/png");
});
