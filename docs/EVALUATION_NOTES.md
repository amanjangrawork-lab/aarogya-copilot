# Evaluation notes for judges (test access — no login needed)

Open the **live URL** (or `index.html` locally). Everything works without signup, keys, or backend.

## 60-second test
1. Click **🧪 Lab report** under "Try 1-click demo data".
2. Read **Simple summary**: headline + flagged values (HbA1c 7.8% ▲, LDL 148 ▲…) + plain meanings + medicines + doctor questions.
3. Switch language selector to **हिन्दी / తెలుగు / தமிழ்** — UI + summary translate.
4. Open **Health timeline**, then **ABHA & FHIR** → **Export FHIR JSON**.

## Full test (5 min)
- **Upload**: drag any PDF/JPG/PNG (photo of a report shows the Tesseract OCR progress bar), or paste text + Analyze. Sample files in `sample-data/`.
- **OCR languages**: ⚙️ Settings → OCR language (+Hindi/Telugu/Tamil).
- **Gemini (optional)**: paste a free Gemini key in ⚙️ → reopen summary → "Enhance with Gemini". Offline summary always shows regardless.
- **ABHA mock**: Link ABHA → mobile → Send OTP → enter `123456` → Verify. Then "Simulate ABHA/ABDM import".
- **FHIR**: check resource counts + LOINC/ICD-10/SNOMED codes, Export then Import the JSON back.
- **Wellness**: "Log BP / sugar / weight" → appears in timeline.
- **Print**: 🖨️ prints a clean summary for a doctor visit.

## Scoring map
- **AI (35%)**: OCR (pdf.js+Tesseract) + extraction (meds/dose/labs/dates/dx) + abnormal explanations. Try the lab sample: 8 flags expected.
- **Architecture (25%)**: see `docs/ARCHITECTURE.md` + `docs/architecture.svg`; FHIR bundle in-app.
- **UX (20%)**: 1-click demos, tabs, timeline, 4-language UI.
- **Impact (10%)**: disclaimers, hedged wording, no dose advice, emergency note.
- **Demo (10%)**: `slides.html` (print to PDF) + this script.

Known limits (honest): heavy handwriting needs the Indic model (R2); reference ranges are adult-general and should be confirmed with your lab/doctor.
