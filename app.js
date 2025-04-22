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

// 1) Initialize Cropper.js on upload
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  imgToCrop.src = URL.createObjectURL(file);
  imgToCrop.style.display = "block";
  cropBtn.style.display = "inline-block";
  if (cropper) cropper.destroy();
  cropper = new Cropper(imgToCrop, { viewMode:1, aspectRatio:1, autoCropArea:0.8 });
});

// 2) Crop, call OpenAI, composite, gallery
cropBtn.addEventListener("click", async () => {
  const canvas = cropper.getCroppedCanvas({ width:512, height:512 });
  canvas.toBlob(async blob => {
    // a) Form with user image
    const form = new FormData();
    form.append("image", blob, "face.png");

    // b) Real PNG mask
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const mctx = maskCanvas.getContext("2d");
    mctx.fillStyle = "white";
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    const maskBlob = await new Promise(r => maskCanvas.toBlob(r, "image/png"));
    form.append("mask", maskBlob, "mask.png");

    // c) Prompt + count + size (no explicit model)
    form.append("prompt",
      `Please repaint this photo to match exactly the style of this reference image: ${STYLE_BG_URL}`
    );
    form.append("n", "1");
    form.append("size", "512x512");

    // d) Call the API
    const resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    const j = await resp.json();
    if (!resp.ok) {
      console.error("Full OpenAI error response:", j);
      return alert("AI styling failed:\n" + (j.error?.message || JSON.stringify(j)));
    }

    // e) Composite the result
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
        resultCanvas.width = bg.width;
        resultCanvas.height = bg.height;
        ctx.drawImage(bg, 0, 0, bg.width, bg.height);
        const x = (bg.width - aiImg.width) / 2;
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

