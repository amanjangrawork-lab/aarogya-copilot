# Evaluation notes for judges — no login, no key, no waiting (faceless-ready)

Open the **live URL** (or double-click `index.html`). Fast static app, demos work offline. This page alone is enough to score.

## 60-second test (must-pass)
1. Click **🧪 Lab report** → auto-goes to **🔍 Review**: see 10 labs with source snippets + confidence. Click **Confirm & save**.
2. Read **Simple summary**: headline + flagged values (HbA1c 7.8% ▲, Hb 11.2 ▼, LDL 148…) + plain meanings + meds + doctor questions. Click **🔊 Listen**.
3. Switch to **हिन्दी** (top-right) — UI + summary translate, drug names stay English.
4. Open **Health timeline** — active meds + HbA1c trend sparkline + chronological events.
5. Open **ABHA & FHIR** → **Export FHIR JSON** (Patient+Observation LOINC+MedicationRequest+Condition ICD-10/SNOMED).
6. Click **✅ Run self-check** (sidebar) — expect 7/7.

## Full test (5 min, every button)
- **Upload:** drag PDF/JPG/PNG → progress bar → Review gate. Or paste text + Analyze. Files in `sample-data/`.
- **Review gate:** yellow = low confidence, edit dose/schedule inline, Confirm saves to timeline, Discard saves nothing. Try Rx-2 for generic-pattern low flag.
- **Conflict:** load Prescription then Discharge — dose-changed banner appears, advises carry both, never auto-adjusts.
- **OCR lang:** ⚙️ → +Hindi/Telugu/Tamil before PNG drop. PDFs use fast pdf.js path.
- **Gemini (optional):** ⚙️ paste key → summary → Enhance. Offline always works without it.
- **ABHA mock:** Link ABHA → 10-digit → Send OTP → `123456` → Verify → Simulate ABDM import adds 1 record.
- **FHIR:** check counts + LOINC/ICD-10/SNOMED, Export then Import back via Import button.
- **Wellness:** Log BP/sugar/weight → appears in timeline + trends.
- **Profile/Print:** Setup profile → stats update. 🖨️ prints clean doctor summary (nav hidden).
- **Delete/Clear:** per-record Delete in Extracted data, 🗑️ clears all (with confirm).

## Scoring map (where to look)
- **AI 35%:** OCR progress + extraction counts + Review provenance + abnormal meanings. Lab sample = 10 labs, Prescription = 4 meds exact.
- **Architecture 25%:** `docs/ARCHITECTURE.md` + `docs/architecture.svg` + live FHIR JSON. Trust gate + FHIR R4 + NRKES profiles.
- **UX 20%:** 1-click demos, 5 tabs, judge banner on top, timeline trends, 4-lang + audio, large touch targets, keyboard + skip-link.
- **Impact 10%:** disclaimers everywhere, hedged wording, no dose advice, emergency 108/112, negation guard, confirmed-vs-auto distinction.
- **Demo 10%:** `slides.html` (Print to PDF) + `docs/DEMO_SCRIPT.md` + optional video.

## Trust proof
`docs/TRUST_CARD.md` (1 page) + `js/selftest.js` (7/7) + `sample-data/07-master-test-matrix.csv` (46 checks). Zero backend — data in localStorage only, Gemini key in memory only.

Known limits (honest): heavy handwriting needs Indic model; adult-general ranges — confirm with your lab/doctor; mock ABHA only, gateway-ready.
