// ———— CONFIG ————
const OPENAI_KEY = "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";  
const STYLE_BG_URL = 
  "https://<YOUR‑USERNAME>.github.io/image-styler/style-ref.png";

// ———— DOM ELEMENTS ————
const fileInput    = document.getElementById("fileInput");
const imgToCrop    = document.getElementById("toCrop");
const cropBtn      = document.getElementById("cropBtn");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
let cropper;

// 1) When user selects a photo:
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Show image and Crop button
  imgToCrop.src = URL.createObjectURL(file);
  imgToCrop.style.display = "block";
  cropBtn.style.display = "inline-block";

  // Initialize or re‑initialize Cropper.js
  if (cropper) cropper.destroy();
  cropper = new Cropper(imgToCrop, {
    viewMode: 1,
    aspectRatio: 1,
    autoCropArea: 0.8
  });
});

// 2) When user clicks “Crop & Style”:
cropBtn.addEventListener("click", async () => {
  // a) Get the cropped face+bust as 512×512 PNG
  const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
  canvas.toBlob(async blob => {
    // b) Prepare our form data
    const form = new FormData();
    form.append("image", blob, "face.png");
    // Blank mask = style whole crop
    const maskData = new Uint8Array(canvas.width * canvas.height).fill(255);
    const maskBlob = new Blob([maskData], { type: "application/octet-stream" });
    form.append("mask", maskBlob, "mask.png");
    form.append("model", "dall-e-3");
    // Prompt with your background style image URL
    form.append("prompt",
      `Please restyle this photo to match exactly the look of this background image: ${STYLE_BG_URL}`
    );

    // c) Call OpenAI images.edit endpoint
    const resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    const j = await resp.json();
    const aiUrl = j.data[0].url;

    // d) Load AI result and composite over your style background
    const ctx = resultCanvas.getContext("2d");
    const aiImg = new Image();
    aiImg.crossOrigin = "anonymous";
    aiImg.src = aiUrl;
    aiImg.onload = () => {
      const bg = new Image();
      bg.crossOrigin = "anonymous";
      bg.src = STYLE_BG_URL;
      bg.onload = () => {
        // Resize canvas to background size
        resultCanvas.width = bg.width;
        resultCanvas.height = bg.height;
        // Draw background
        ctx.drawImage(bg, 0, 0, bg.width, bg.height);
        // Center AI image on top
        const x = (bg.width - aiImg.width) / 2;
        const y = (bg.height - aiImg.height) / 2;
        ctx.drawImage(aiImg, x, y);
        // Show and hook up download/gallery
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
