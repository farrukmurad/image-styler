// Points at your Netlify function
const API_URL = "/.netlify/functions/style";

const fileInput    = document.getElementById("fileInput");
const previewImg   = document.getElementById("previewImg");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");
const ctx          = resultCanvas.getContext("2d");

// Convert File -> base64 PNG
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result.split(",")[1]);
    reader.onerror = () => rej("File read failed");
    reader.readAsDataURL(file);
  });
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please select a photo");

  // 1) Preview + convert
  let b64;
  try {
    b64 = await fileToBase64(file);
    previewImg.src           = "data:image/png;base64," + b64;
    previewImg.style.display = "block";
  } catch (e) {
    return alert("Conversion failed: " + e);
  }

  // 2) Send to your function
  let resp, json;
  try {
    resp = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ imageBase64: b64 })
    });
    json = await resp.json();
    if (!resp.ok) throw json;
  } catch (err) {
    console.error(err);
    return alert("Styling failed:\n" + (err.error || err.message || JSON.stringify(err)));
  }

  // 3) Draw the returned bust
  previewImg.style.display = "none";
  const url = json.data[0].url;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src         = url;
  img.onload      = () => {
    resultCanvas.width  = img.width;
    resultCanvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    resultCanvas.style.display = "block";
    downloadBtn.style.display  = "inline-block";
    downloadBtn.href           = resultCanvas.toDataURL("image/png");

    const thumb = document.createElement("img");
    thumb.src = resultCanvas.toDataURL("image/png");
    gallery.prepend(thumb);
  };
});
