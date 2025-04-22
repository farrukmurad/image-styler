


// app.js
const fileInput    = document.getElementById('fileInput');
const previewImg   = document.getElementById('previewImg');
const resultCanvas = document.getElementById('resultCanvas');
const downloadBtn  = document.getElementById('downloadBtn');
const gallery      = document.getElementById('gallery');
const ctx          = resultCanvas.getContext('2d');

const API_URL = '/.netlify/functions/style';
const STYLE_BG = 'https://farrukmurad.github.io/image-styler/style-ref.png';

// Convert file → base64 PNG
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.onerror = () => rej('File read error');
    reader.readAsDataURL(file);
  });
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return alert('Select a photo');

  // Preview & convert
  let b64;
  try {
    b64 = await fileToBase64(file);
    previewImg.src = 'data:image/png;base64,' + b64;
    previewImg.style.display = 'block';
  } catch (e) {
    return alert('Preview error: ' + e);
  }

  // Send to function
  let resp, data;
  try {
    resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: b64 })
    });
    data = await resp.json();
    if (!resp.ok) throw data;
  } catch (err) {
    console.error(err);
    return alert('Styling failed: ' + (err.error?.message||JSON.stringify(err)));
  }

  // Draw result over style background
  previewImg.style.display = 'none';
  const aiUrl = data.data[0].url;
  const aiImg = new Image();
  aiImg.crossOrigin = 'anonymous';
  aiImg.src = aiUrl;
  aiImg.onload = () => {
    const bg = new Image();
    bg.crossOrigin = 'anonymous';
    bg.src = STYLE_BG;
    bg.onload = () => {
      resultCanvas.width = bg.width;
      resultCanvas.height = bg.height;
      ctx.drawImage(bg,0,0);
      ctx.drawImage(aiImg, (bg.width-512)/2, (bg.height-512)/2, 512,512);
      resultCanvas.style.display = 'block';
      downloadBtn.style.display = 'inline-block';
      downloadBtn.href = resultCanvas.toDataURL('image/png');
      const thumb = document.createElement('img');
      thumb.src = resultCanvas.toDataURL('image/png');
      gallery.prepend(thumb);
    };
  };
});
