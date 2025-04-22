// ———— CONFIG ————
const OPENAI_KEY = "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";  
const STYLE_BG_URL = 
  "https://farrukmurad.github.io/image-styler/style-ref.png";



// ——— DOM ELEMENTS ———
const fileInput    = document.getElementById("fileInput");
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn  = document.getElementById("downloadBtn");
const gallery      = document.getElementById("gallery");

// When user picks a file, fire the AI call immediately
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Build form: same file for image + mask (whole-photo repaint)
  const form = new FormData();
  form.append("image", file, "user.png");
  form.append("mask",  file, "mask.png");

  // Instruct DALL·E to match your style background
  form.append("prompt",
    `Please repaint this entire photo to match exactly the style of this reference image: ${STYLE_BG_URL}`
  );
  form.append("n",    "1");
  form.append("size", "512x512");

  // Call the edits endpoint
  const resp = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form
  });
  const text = await resp.text();
  let j;
  try { j = JSON.parse(text); }
  catch {
    return alert("AI error:\n" + text);
  }
  if (!resp.ok) {
    console.error("OpenAI error:", j);
    return alert("AI styling failed:\n" + (j.error?.message || JSON.stringify(j)));
  }

  // Draw background + AI result onto canvas
  const aiUrl = j.data[0].url;
  const ctx   = resultCanvas.getContext("2d");
  const aiImg = new Image();
  aiImg.crossOrigin = "anonymous";
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = STYLE_BG_URL;
    bg.onload = () => {
      // Resize canvas to bg
      resultCanvas.width  = bg.width;
      resultCanvas.height = bg.height;
      ctx.drawImage(bg, 0, 0);
      // Center AI image
      const x = (bg.width - aiImg.width) / 2;
      const y = (bg.height - aiImg.height) / 2;
      ctx.drawImage(aiImg, x, y);

      // Show download link
      resultCanvas.style.display = "block";
      downloadBtn.style.display  = "inline-block";
      downloadBtn.href           = resultCanvas.toDataURL("image/png");

      // Add thumbnail to gallery
      const thumb = document.createElement("img");
      thumb.src = resultCanvas.toDataURL("image/png");
      gallery.prepend(thumb);
    };
  };
});
