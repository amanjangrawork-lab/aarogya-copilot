/* Rule-based clinical extractor: medicines, labs, vitals, diagnoses, dates.
   Designed for Indian prescriptions / lab reports / discharge summaries.
   Returns structured JSON that the summarizer + FHIR builder consume. */

function normalizeText(t) {
  return (t || "").replace(/\r/g, "\n").replace(/[\t ]+/g, " ").trim();
}

function extractDates(text) {
  const out = new Set();
  const patterns = [
    /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g,
    /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi,
    /\b(\d{1,2}[\s\-\/.]*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/.]*\d{2,4})\b/gi,
  ];
  for (const re of patterns) {
    let m; const src = text;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) out.add(m[0].trim());
    if (out.size > 8) break;
  }
  return [...out].slice(0, 8);
}

function extractMedicines(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const med of COMMON_MEDICINES) {
    const esc = med.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const idx = lower.search(new RegExp("\\b" + esc + "\\b"));
    if (idx === -1) continue;
    // Dose + frequency follow the medicine name — look only ahead, so a previous
    // line's dose (or letters inside the name, e.g. "od" in "Amlodipine") can't match.
    const window = text.slice(idx + med.length, idx + med.length + 70);
    // Lab lines like "Vitamin D (25-OH) 18 ng/mL (Ref 30-100)" are tests, not meds.
    if (/\(\s*ref\b/i.test(window)) continue;
    const doseMatch = window.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|iu|units?))\b/i);
    const freqMatch = window.match(/(\d\s*[-–]\s*\d\s*[-–]\s*\d|\d\s*[-–]\s*\d|\bOD\b|\bBD\b|\bTDS\b|\bQID\b|\bHS\b|S\.?O\.?S|once daily|twice daily|thrice|at bedtime|before food|after food|1-0-1|1-1-1|0-0-1|1-0-0)/i);
    const daysMatch = window.match(/(?:x|for|\u00d7)\s*(\d{1,3})\s*(?:days?|weeks?)/i);
    // Trust layer (clinical-note-extract skill): every value carries span + confidence.
    // High = dose AND schedule found verbatim. Medium = one found. Low = neither / generic fallback.
    const hasDose = !!doseMatch, hasFreq = !!freqMatch;
    const confidence = (hasDose && hasFreq) ? "high" : (hasDose || hasFreq) ? "medium" : "low";
    const span = (med + " " + window.trim()).slice(0, 120);
    found.push({
      name: med.replace(/\b\w/g, c => c.toUpperCase()),
      dosage: doseMatch ? doseMatch[1].trim() : "as written",
      frequency: freqMatch ? freqMatch[1].trim() : "as directed",
      duration: daysMatch ? daysMatch[1] + " days" : "",
      evidence: window.trim().slice(0, 90),
      span,
      confidence,
      needsReview: confidence !== "high",
      null_reason: confidence === "low" ? "dose/schedule not legible — confirm with prescription" : "",
    });
  }
  // Generic "Tab/Cap/Syp <Name> <dose>" fallback for meds not in list
  const genericRe = /\b(?:Tab|Tablet|Cap|Capsule|Syp|Syrup|Inj|Injection)\.?\s+([A-Z][A-Za-z\- ]{2,30}?)\s+(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|IU))\b/g;
  let m;
  while ((m = genericRe.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length < 3) continue;
    if (found.some(f => f.name.toLowerCase() === name.toLowerCase())) continue;
    if (/blood|report|test|hospital|doctor|patient|date|age|weight/i.test(name)) continue;
    found.push({ name, dosage: m[2].trim(), frequency: "as directed", duration: "", evidence: m[0], span: m[0], confidence: "low", needsReview: true, null_reason: "generic pattern — verify name/dose" });
    if (found.length > 20) break;
  }
  return found.slice(0, 20);
}

function extractLabs(text) {
  const results = [];
  const cleaned = text.replace(/,/g, "");
  for (const ref of LAB_REFERENCE) {
    for (const alias of ref.names) {
      // e.g. "HbA1c ... 7.2 ... %"  or "Hemoglobin: 9.8 g/dL"
      const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(esc + "\\s*(?:\\([^)]*\\))?\\s*[:\\-–=]?\\s*(\\d+(?:\\.\\d+)?)\\s*(" + ref.unit.replace("/", "\\/").replace("µ", "µ?").replace(".", "\\.") + ")?", "i");
      const m = cleaned.match(re);
      if (m) {
        const value = parseFloat(m[1]);
        if (Number.isNaN(value)) continue;
        let flag = "normal";
        if (value < ref.low) flag = "low";
        else if (value > (ref.borderlineHigh ?? ref.high)) flag = ref.key === "hdl" ? "normal" : "high";
        else if (value > ref.high) flag = ref.key === "hdl" ? "low" : "borderline";
        // HDL inverted: low is bad
        if (ref.key === "hdl" && value < ref.low) flag = "low";
        else if (ref.key === "hdl" && value >= ref.low) flag = "normal";
        const unitFound = !!m[2];
        results.push({ key: ref.key, test: ref.display, value, unit: unitFound ? ref.unit : (m[2] || ref.unit), low: ref.low, high: ref.high, flag, loinc: ref.loinc, meaning: ref.meaning, span: m[0].slice(0, 120), confidence: unitFound ? "high" : "medium", needsReview: !unitFound, source: alias });
        break;
      }
    }
  }
  // BP: require explicit context (avoids matching dates like 12/03/2026)
  // matches "BP 140/90", "blood pressure 128/82", "140/90 mmHg"
  const bpCtx = text.match(/(?:\bbp\b|blood pressure)[^0-9]{0,25}(\d{2,3})\s*\/\s*(\d{2,3})/i)
    || text.match(/(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mm\s*hg|mmhg)/i);
  if (bpCtx) {
    const sys = parseInt(bpCtx[1], 10), dia = parseInt(bpCtx[2], 10);
    const ref = LAB_REFERENCE.find(r => r.key === "bp_sys");
    let flag = sys >= 140 || dia >= 90 ? "high" : (sys >= 120 ? "borderline" : "normal");
    results.push({ key: "bp", test: "Blood Pressure", value: sys + "/" + dia, unit: "mmHg", low: "90/60", high: "120/80", flag, loinc: "85354-9", meaning: ref.meaning, span: bpCtx[0].slice(0, 60), confidence: "high", needsReview: false, source: "bp" });
  }
  return results;
}

function extractDiagnoses(text) {
  const lower = text.toLowerCase();
  const out = [];
  for (const d of DIAGNOSIS_MAP) {
    for (const alias of d.match) {
      const idx = lower.indexOf(alias);
      if (idx === -1) continue;
      // negation guard: "dengue NS1 negative", "no fever", "ruled out", "denies"
      const before = lower.slice(Math.max(0, idx - 30), idx);
      const after = lower.slice(idx, idx + alias.length + 20);
      if (/(negative|ruled out|\bno\b|denies|denied|absent|normal)\s*$/.test(before)) continue;
      if (/negative/.test(after.slice(0, 20))) continue;
      out.push(d); break;
    }
  }
  return out;
}

function detectDocType(text) {
  const t = text.toLowerCase();
  if (/discharge summary|admission|discharged|hospital course/.test(t)) return "discharge_summary";
  // diagnostic before prescription: imaging/ECG reports often mention mg/OD meds too
  if (/x-?ray|ultrasound|\busg\b|ct scan|\bmri\b|\becg\b/.test(t)) return "diagnostic_report";
  // prescription before lab: an Rx listing meds beats a "review with HbA1c" mention
  const medHits = (t.match(/\b(tab|tablet|cap|capsule|syrup|injection)\b/g) || []).length;
  if (/^\s*rx\b|\n\s*rx\b|take.*daily|1-0-1|1-1-1|0-0-1/.test(t) && medHits >= 1) return "prescription";
  if (/hba1c|cbc|lipid panel|creatinine|platelets?\s+\d|hemoglobin\s+\d|reference range|pathology|sample collected/.test(t)) return "lab_report";
  if (/rx|tablet|tab\.|capsule|syrup|dosage|mg\b|od\b|bd\b|tds/.test(t)) return "prescription";
  if (/x-?ray|ultrasound|usg|ct scan|mri|ecg/.test(t)) return "diagnostic_report";
  return "general_record";
}

function extractRecord(rawText, fileName) {
  const text = normalizeText(rawText);
  const docType = detectDocType(text);
  const medicines = extractMedicines(text);
  const labs = extractLabs(text);
  const diagnoses = extractDiagnoses(text);
  const dates = extractDates(text);
  // Doctor / hospital heuristics
  const docMatch = text.match(/(?:Dr\.?|Doctor)\s+([A-Z][A-Za-z .]{2,40})/);
  const hospMatch = text.match(/([A-Z][A-Za-z &]{3,50}(?:Hospital|Clinic|Centre|Center|Imaging|Nursing Home|Diagnostics|Labs?|Pathology))/);
  return {
    id: "rec_" + Date.now().toString(36) + Math.floor(Math.random() * 999),
    fileName: fileName || "pasted-text",
    docType, text,
    medicines, labs, diagnoses, dates,
    doctor: docMatch ? docMatch[1].trim().slice(0, 50) : "",
    facility: hospMatch ? hospMatch[1].trim().slice(0, 70) : "",
    createdAt: new Date().toISOString(),
  };
}
