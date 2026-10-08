# 🩺 Aarogya Copilot — AI-Powered Personal Health Copilot

Upload prescriptions, lab reports & discharge summaries → **OCR → structured extraction → plain-language summary (EN/HI/TE/TA) → unified timeline → ABDM-ready FHIR bundle with mock ABHA.**

Built for the **Altrix Labs — AI-Powered Personal Health Copilot** hackathon (Round 1).

## ✨ What works (all offline, zero backend)

- **Ingest + OCR**: PDF (pdf.js text layer) + photos/scans (Tesseract.js `eng+hin+tel+tam`) + paste-text; scanned-PDF auto-render → OCR
- **Extraction**: medicines + dosages + schedules, 14 lab tests with LOINC + high/low/borderline flags, diagnoses (ICD-10 + SNOMED CT), dates, doctor/facility, doc-type
- **Simple summary**: headline, "what this abnormal value means", meds explained, questions-to-ask-doctor, next steps — in **English, हिन्दी, తెలుగు, தமிழ்** + optional Gemini 1.5 Flash enhancement (key optional)
- **Timeline + profile**: records + wellness logs (BP/sugar/weight) in one chronological view, localStorage persistence
- **ABDM-ready**: FHIR R4 Bundle (Patient+ABHA id, Observation/LOINC, MedicationRequest, Condition/ICD-10+SNOMED, DocumentReference), mock ABHA link (OTP `123456`), mock ABDM import, export/import JSON
- **Safety**: educational-only disclaimers, hedged wording, no dose-change advice, emergency banner

## 🚀 Run (30 seconds)

No install. Either:

```bash
# any static server
python -m http.server 8000
# → http://localhost:8000
```

or just double-click `index.html` (CDNs need internet for pdf.js/Tesseract; everything else is local).

**Judge path (60s):** click 🧪 Lab report → read summary → switch to हिन्दी → Timeline → ABHA & FHIR → Export JSON.

## 🧪 Test data

- `sample-data/01-prescription.txt`, `02-lab-report.txt`, `03-discharge-summary.txt`
- In-app 1-click demo buttons load the same content

## 🏗️ Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) + [`docs/architecture.svg`](docs/architecture.svg).
Pipeline: ingest → OCR → rule extractor → 4-language summarizer (+Gemini) → profile/timeline → FHIR/ABHA.
Zero backend; swap the two `abha*` stubs in `js/app.js` for real ABDM gateway calls in production.

## 🌐 Deploy (free, 2 min) — for the "Live application URL" field

**GitHub Pages (recommended):** push this folder → repo Settings → Pages → Deploy from branch → `main` `/root` → URL `https://<you>.github.io/<repo>/`.
**Vercel/Netlify:** import the repo, no build command, output dir `.`.

## 📽️ Demo

- `slides.html` — 5-slide deck (open + print to PDF for submission)
- `docs/DEMO_SCRIPT.md` — 3-min script · `docs/EVALUATION_NOTES.md` — judge test guide

## ⚠️ Disclaimer

Educational summaries only — not medical advice, not a diagnosis. Always consult a registered medical practitioner.
