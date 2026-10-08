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
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".txt") || file.type.startsWith("text")) return await file.text();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const txt = await extractPdfText(file);
    if (txt && txt.replace(/\s/g, "").length > 40) return txt;
    // scanned PDF: render first page and OCR
    if (typeof pdfjsLib !== "undefined") {
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
        return await ocrImage(blob, onProgress, ocrLang);
      } catch { /* fall through */ }
    }
    return txt;
  }
  if (file.type.startsWith("image/")) return await ocrImage(file, onProgress, ocrLang);
  // unknown: try text, then OCR
  try { const tx = await file.text(); if (tx.trim().length > 20) return tx; } catch {}
  return await ocrImage(file, onProgress, ocrLang);
}
