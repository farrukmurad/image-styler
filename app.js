// ← Paste your actual API key between the quotes:
const OPENAI_KEY = "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";

// Grab the buttons and containers by their “id”
const fileInput    = document.getElementById("fileInput");
const imgToCrop    = document.getElementById("toCrop");
const cropBtn      = document.getElementById("cropBtn");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");

let cropper; // we’ll store the cropper instance here

// 1) After you pick a file:
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return; // nothing selected

  // Show the image and “Crop & Style” button
  imgToCrop.src = URL.createObjectURL(file);
  imgToCrop.style.display = "block";
  cropBtn.style.display = "inline-block";

  // If we had an old cropper, destroy it
  if (cropper) cropper.destroy();

  // Start a new Cropper.js on that image
  cropper = new Cropper(imgToCrop, {
    viewMode: 1,
    aspectRatio: 1,      // square crop (head+bust)
    autoCropArea: 0.8
  });
});

// 2) When you click “Crop & Style”:
cropBtn.addEventListener("click", async () => {
  // a) Turn the cropped area into a 512×512 image
  const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
  canvas.toBlob(async blob => {
    // b) Prepare form data for OpenAI: original crop + blank mask
    const form = new FormData();
    form.append("image", blob, "face.png");

    // Blank mask of same size (so we style the whole crop)
    const maskData = new Uint8Array(canvas.width * canvas.height).fill(255);
    const maskBlob = new Blob([maskData], { type: "application/octet-stream" });
    form.append("mask", maskBlob, "mask.png");

    form.append("model", "dall-e-3");
    form.append("prompt",
      "Recreate this portrait in an electric‑cyan, high‑contrast 3D bust style."
    );

    // c) Call the OpenAI API
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form
    });
    const data = await response.json();
    const styledUrl = data.data[0].url; // The URL of your new cyan‑bust

    // d) Draw that new image on our canvas
    const ctx = resultCanvas.getContext("2d");
    const styledImg = new Image();
    styledImg.crossOrigin = "anonymous";
    styledImg.src = styledUrl;
    styledImg.onload = () => {
      resultCanvas.width = styledImg.width;
      resultCanvas.height = styledImg.height;
      ctx.drawImage(styledImg, 0, 0);
      resultCanvas.style.display = "block";
      downloadBtn.style.display = "inline-block";
      downloadBtn.href = resultCanvas.toDataURL("image/png");

      // e) Add it as a small thumbnail in the gallery
      const thumb = document.createElement("img");
      thumb.src = resultCanvas.toDataURL("image/png");
      gallery.prepend(thumb);
    };
  }, "image/png");
});
