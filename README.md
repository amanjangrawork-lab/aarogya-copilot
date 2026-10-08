# 🩺 Aarogya Copilot — AI-Powered Personal Health Copilot

> **Judge in 60 seconds, no help needed.** Open the live URL → click 🧪 Lab report → 🔍 Review → Confirm & save → Simple summary → हिन्दी → Timeline (trends) → ABHA & FHIR → Export. Click ✅ Run self-check for 11/11 proof. No login, no key, works offline.

**What:** Caregiver uploads messy prescriptions, labs, discharge summaries → trustworthy health timeline + plain-language explanation.
**Why:** Records are fragmented across paper, WhatsApp PDFs, labs. Caregiver job: “What changed, what meds are active, what to carry to doctor?”
**How:** Upload → Classify → OCR → Extract with confidence + source span → **Human Review-before-save** → Active meds + lab trends + dose-change flags → Explain EN/HI/TE/TA → FHIR export + mock ABHA.
**Tech:** Zero-backend static web app (HTML/CSS/JS, no build, fast). pdf.js + Tesseract.js (eng+hin/tel/tam), localStorage, optional Gemini 1.5 Flash. FHIR R4 + LOINC + ICD-10 + SNOMED CT, ABDM NRKES profiles.
**Data:** 6 synthetic samples only, no real patients. `sample-data/07-master-test-matrix.csv` = 46 checks. Self-check 11/11 offline (6 samples + FHIR bundle + 4 edge cases: negation, frequencies, dates, unit-confidence).
**Value:** Fewer repeat tests, safer adherence, calmer doctor visits, regional access. Wedge: visible uncertainty + provenance + reconciliation, not generic chat.

Built for **Altrix Labs — AI-Powered Personal Health Copilot** Round 1.

## ✨ Everything works — no dead buttons

- **Add record:** drag PDF/JPG/PNG (progress bar) / paste text + Analyze / 6 one-click demos (💊🧪🏥🩻 + Rx-2/Lab-2)
- **🔍 Review (trust gate):** low-confidence meds yellow-flagged with source snippet, editable dose/schedule, Confirm & save / Discard. Dose-changes offer Keep new / Keep earlier — your choice is logged. Nothing auto-saves uncertain.
- **Simple summary:** headline, flagged labs with “what it means”, meds (names never translated), questions-to-ask-doctor, next steps, disclaimer + 🔊 Listen (en/hi/te/ta voices). 🖨️ Print produces a one-page doctor visit sheet.
- **Extracted data:** tables + Delete + Original OCR text expandable (provenance) + 📜 provenance ledger (every value → doc, span, confidence, status)
- **Timeline:** search + All/Meds/Labs/Visits/Wellness filters, active meds (latest per drug) + lab trend sparklines (rising/falling) + chronological events + wellness logs
- **ABHA & FHIR:** ✅ FHIR R4 validity badge, mock Link ABHA (OTP `123456`), Simulate ABDM import, Export/Import FHIR JSON, 🔗 7-day revocable share link (mock consent)
- **Side tools:** Setup profile, Log BP/sugar/weight, 🔔 daily log reminder (on-device only), ✅ Run self-check, 🗑️ Clear, ⚙️ Settings (Gemini key optional + OCR lang), 🖨️ Print clean summary. Installable PWA — works offline after first visit.
- **Safety:** educational-only, hedged wording, no dose advice, emergency 108/112 banner always on top, negation guard (e.g. “dengue negative” not counted)

## 🚀 Start fast (30 sec)

```bash
python -m http.server 8000
# → http://localhost:8000
```

Or double-click `index.html`. Demos + paste-text + summaries work offline. Photo/PDF OCR needs internet once for CDN libraries (clear guidance shown in-app when offline). 10 MB per-file guard with plain-language errors. Data stays in your browser.

## 🧪 Test data (synthetic, safe)

- `01-prescription.txt` — 4 meds, T2DM + HTN, 12/03/2026
- `02-lab-report.txt` — 10 labs (HbA1c 7.8 ▲, LDL 148, Hb 11.2 ▼…), 10/03/2026
- `03-discharge-summary.txt` — 5 meds TDS/SOS/OD, BP 140/90, DOA/DOD
- `04-diagnostic-report.txt` — X-ray+ECG+USG, BP 138/88
- `05-prescription-asthma-thyroid.txt` — 5 meds incl 50mcg + inhaler
- `06-lab-report-thyroid-vitd.txt` — TSH 8.2 ▲, Vit-D 18 ▼
- `07-master-test-matrix.csv` — 46 expected checks
- `make-ocr-samples.html` — 1-click PNG (Tesseract path) + PDF (pdf.js path) generator
- In-app demos load the same content instantly

## 🏗️ Architecture

See `docs/ARCHITECTURE.md` + `docs/architecture.svg` + `docs/TRUST_CARD.md`.
Pipeline: ingest → multi-page OCR → rule extractor (confidence+span) → Review gate (Keep new/earlier) → trends/active-meds → 4-lang summarizer (+Gemini) → timeline (search+filters) → FHIR/ABHA mock + share. Zero backend; swap `abha*` stubs in `js/app.js` for real ABDM gateway in prod.

## 🌐 Deploy — Live URL field

**GitHub Pages:** push folder → Settings → Pages → Deploy from branch → `main` `/root` → `https://<you>.github.io/<repo>/`.
**Vercel/Netlify:** import repo, no build, output `.`. Verify: Lab demo → Review → Hindi → Timeline → Export.

## 📽️ Demo + evaluation

- `slides.html` — 5 slides (print to PDF backup)
- `docs/DEMO_SCRIPT.md` — 3-min script with Review + trends
- `docs/EVALUATION_NOTES.md` — 60-sec + 5-min judge guide
- `docs/TRUST_CARD.md` — 1-page metrics (accuracy, zero unsafe auto-fill, grounding, privacy)

## ⚠️ Disclaimer

Educational summaries only — not medical advice, not diagnosis. Always consult a registered medical practitioner. In emergency call 108/112.
