# Evaluation notes for judges — no login, no key, no waiting (faceless-ready)

Open the **live URL** (or double-click `index.html`). Fast static app, demos work offline. This page alone is enough to score.

## 60-second test (must-pass)
1. Click **🧪 Lab report** → auto-goes to **🔍 Review**: see 10 labs with source snippets + confidence. Click **Confirm & save**.
2. Read **Simple summary**: headline + flagged values (HbA1c 7.8% ▲, Hb 11.2 ▼, LDL 148…) + plain meanings + meds + doctor questions. Click **🔊 Listen**. Press **🖨️** anytime for the one-page doctor visit sheet.
3. Switch to **हिन्दी** (top-right) — UI + summary translate, drug names stay English.
4. Open **Health timeline** — search “metformin”, try Meds/Labs filters — active meds + HbA1c trend sparkline + chronological events.
5. Open **Extracted data** → scroll to **📜 Provenance ledger** (every value → doc, span, confidence, status).
6. Open **ABHA & FHIR** → see **✅ FHIR R4 valid** badge → **Export FHIR JSON** → **Create 7-day share link** → Revoke it.
7. Click **✅ Run self-check** (sidebar) — expect 11/11.

## Full test (5 min, every button)
- **Upload:** drag PDF/JPG/PNG → progress bar → Review gate (files over 10 MB get a plain-language error). Multi-page scanned PDFs OCR every page. Or paste text + Analyze. Files in `sample-data/`.
- **Review gate:** yellow = low confidence, edit dose/schedule inline, dose-change offers Keep new / Keep earlier, Confirm saves to timeline, Discard saves nothing. Try Rx-2 for generic-pattern low flag.
- **Conflict:** load Prescription then Discharge — dose-changed banner appears with resolver; your choice is logged on the record.
- **Timeline:** search + All/Meds/Labs/Visits/Wellness filters; trends across records; empty-search guidance.
- **Ledger:** Extracted data → 📜 Provenance ledger.
- **OCR lang:** ⚙️ → +Hindi/Telugu/Tamil before PNG drop. PDFs use fast pdf.js path. Fully offline? Demos + paste always work; a clear in-app note says so.
- **Gemini (optional):** ⚙️ paste key → summary → Enhance. Offline always works without it.
- **ABHA mock:** Link ABHA → 10-digit → Send OTP → `123456` → Verify → Simulate ABDM import adds 1 record.
- **FHIR:** ✅ validity badge + resource counts + LOINC/ICD-10/SNOMED codes, Export then Import back, 7-day share → Copy → Revoke.
- **Wellness:** Log BP/sugar/weight → appears in timeline + trends. 🔔 reminder nudges when today's log is missing (on-device only).
- **Profile/Print:** Setup profile → stats update. 🖨️ prints the one-page doctor visit sheet (nav hidden, summary forced visible).
- **Delete/Clear:** per-record Delete in Extracted data, 🗑️ clears all (with confirm). PWA: install from browser menu, works offline after first visit.

## Scoring map (where to look)
- **AI 35%:** OCR progress + extraction counts + Review provenance + abnormal meanings. Lab sample = 10 labs, Prescription = 4 meds exact.
- **Architecture 25%:** `docs/ARCHITECTURE.md` + `docs/architecture.svg` + live FHIR JSON. Trust gate + FHIR R4 + NRKES profiles.
- **UX 20%:** 1-click demos, 5 tabs, judge banner on top, timeline trends, 4-lang + audio, large touch targets, keyboard + skip-link.
- **Impact 10%:** disclaimers everywhere, hedged wording, no dose advice, emergency 108/112, negation guard, confirmed-vs-auto distinction.
- **Demo 10%:** `slides.html` (Print to PDF) + `docs/DEMO_SCRIPT.md` + optional video.

## Trust proof
`docs/TRUST_CARD.md` (1 page) + `js/selftest.js` (11/11) + `sample-data/07-master-test-matrix.csv` (46 checks). Zero backend — data in localStorage only, Gemini key in memory only.

Known limits (honest): heavy handwriting needs Indic model; adult-general ranges — confirm with your lab/doctor; mock ABHA only, gateway-ready.
