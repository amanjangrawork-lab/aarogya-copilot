/* OCR + PDF text layer: pdf.js first (fast, exact), Tesseract.js fallback (scans/photos, EN+HI+TE+TA). */
async function extractPdfText(file) {
  try {
    if (typeof pdfjsLib === "undefined") return "";
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = "";
    const n = Math.min(pdf.numPages, 12);
    for (let p = 1; p <= n; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      out += tc.items.map(i => i.str).join(" ") + "\n";
    }
    return out.trim();
  } catch { return ""; }
}

async function ocrImage(fileOrUrl, onProgress, ocrLang = "eng") {
  if (typeof Tesseract === "undefined") throw new Error("OCR library not loaded (offline). Paste text instead.");
  const map = { eng: "eng", hin: "hin", tel: "tel", tam: "tam" };
  const langs = [...new Set(["eng", ...(ocrLang.split("+").map(s => map[s] || s))])].join("+");
  const { data } = await Tesseract.recognize(fileOrUrl, langs, {
    logger: m => { if (m.status === "recognizing text" && onProgress) onProgress(m.progress); },
  });
  return (data.text || "").trim();
}

async function extractTextFromFile(file, onProgress, ocrLang) {
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_BYTES) throw new Error(`“${file.name}” is ${(file.size / 1048576).toFixed(1)} MB — over the 10 MB limit. Try a smaller photo, or split the PDF and upload pages separately.`);
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".txt") || file.type.startsWith("text")) return await file.text();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const txt = await extractPdfText(file);
    if (txt && txt.replace(/\s/g, "").length > 40) return txt;
    // scanned PDF: render EVERY page (up to 8) and OCR each — page 1 only loses data
    if (typeof pdfjsLib !== "undefined") {
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const n = Math.min(pdf.numPages, 8);
        let out = "";
        for (let p = 1; p <= n; p++) {
          if (onProgress) onProgress((p - 1) / n * 0.9);
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
          const t = await ocrImage(blob, fr => { if (onProgress) onProgress(((p - 1) + fr) / n); }, ocrLang);
          out += `\n=== page ${p} ===\n` + t;
        }
        if (out.replace(/\s/g, "").length > 20) return out.trim();
      } catch { /* fall through to guidance below */ }
    }
    if (txt) return txt;
    throw new Error("No readable text in this PDF. If it is a photo-scan, check your internet (OCR library loads from CDN), or paste the text manually.");
  }
  if (file.type.startsWith("image/")) return await ocrImage(file, onProgress, ocrLang);
  // unknown: try text, then OCR
  try { const tx = await file.text(); if (tx.trim().length > 20) return tx; } catch {}
  return await ocrImage(file, onProgress, ocrLang);
}
