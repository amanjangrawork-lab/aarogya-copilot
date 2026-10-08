# Submission draft — copy-paste into the hackathon form

## Project title
**Aarogya Copilot — AI-Powered Personal Health Copilot (ABDM-ready, 4-language)**

## Project description (use as-is)
Aarogya Copilot turns fragmented prescriptions, lab reports, discharge summaries and diagnostic records into one plain-language health story. Upload a PDF/photo (or paste text): pdf.js + Tesseract OCR (English + Hindi/Telugu/Tamil packs) extracts medicines with dosages/schedules, 14 lab tests with LOINC-coded high/low/borderline flags, diagnoses (ICD-10 + SNOMED CT), dates and doctor/facility. An offline AI summarizer explains every abnormal value ("what HbA1c 7.8% means"), lists medicines, suggests questions to ask the doctor and next steps — in English, हिन्दी, తెలుగు and தமிழ் — with an optional Gemini 1.5 Flash enhancement. Records plus wellness logs (BP/sugar/weight) merge into a unified timeline and health profile, and everything exports as a FHIR R4 bundle (ABDM NRKES profiles) with a mock ABHA link (OTP 123456) and mock ABDM import. Zero backend: data stays in the browser, deploys free to GitHub Pages. Safety-first: educational-only disclaimers, hedged wording, no dose-change advice, emergency banner.

## Live application URL
`https://amanjangrawork-lab.github.io/aarogya-copilot/` ✅ live (verified HTTP 200). Judge check: homepage loads → click 🧪 Lab report → summary appears.

## GitHub repository
`https://github.com/amanjangrawork-lab/aarogya-copilot` ✅ pushed (`main`).

## Demo video URL (optional)
Record a 3-min Loom/YouTube unlisted following `docs/DEMO_SCRIPT.md` (hook → upload/OCR → Hindi summary → timeline → ABHA/FHIR export). Or submit `slides.html` printed to PDF as backup.

## Test access and evaluation notes (paste)
No login, no keys, no backend needed. 60-second test: (1) open live URL, (2) click "🧪 Lab report" demo, (3) read Simple summary (8 flagged values with plain meanings — HbA1c 7.8% ▲, Hb 11.2 ▼, LDL 148 borderline…), (4) switch language to हिन्दी, (5) open Health timeline then ABHA & FHIR → Export JSON. Full guide: `docs/EVALUATION_NOTES.md`. ABHA mock OTP: 123456. Samples: `sample-data/`. Offline summaries always work; Gemini key (⚙️) is optional. Known limit: heavy handwriting needs R2 Indic model; ranges are adult-general — confirm with your doctor.

## Publish status
✅ Already published — `main` is live on Pages. To update: edit → `git add -A && git commit -m "msg" && git push` (Pages rebuilds in ~1 min).
