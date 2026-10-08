# Architecture — Aarogya Copilot (premium, trust-gated, faceless-fast)

Offline-first, zero-backend static app. Fast: no build, no server, first paint = HTML+CSS, CDN (pdf.js/Tesseract) lazy after UI. Data stays in `localStorage`.

## Pipeline (what judges see in 60s)

```
[ PDF / JPG / PNG / paste / 1-click demo ]
         │
         ▼
┌──────────────────┐  pdf.js text layer (digital PDFs, fast) + Tesseract.js
│  Ingest + OCR     │  fallback (scans/photos, eng + hin/tel/tam selectable)
└────────┬─────────┘  progress bar; page markers preserved as evidence
         ▼ raw text + pages
┌──────────────────┐  medicines (60+ list + Tab/Cap regex, dose+OD/BD/TDS/1-0-1)
│ Extractor +      │  labs (14 tests + LOINC, high/low/borderline) + BP pattern
│ Trust (JS)       │  diagnoses (ICD-10+SNOMED, negation guard) + dates + doc-type
│                  │  → each value: {value, span, confidence high/med/low, needsReview}
└────────┬─────────┘
         ▼ staged record
┌──────────────────┐  🔍 Review-before-save: source snippet per row, inline
│ Review gate      │  dose/schedule edit, Confirm & save / Discard.
└────────┬─────────┘  Conflicts: same drug different dose → flagged, never auto-merged
         ▼ confirmed record
┌──────────────────┐  Active meds (latest per drug) + lab trend sparklines +
│ Timeline         │  chronological events + wellness (BP/sugar/weight)
└────────┬─────────┘
┌──────────────────┐  Offline templates EN/HI/TE/TA: headline, flagged meanings,
│ Summarizer       │  meds (names untranslated), ask-doctor, next steps + 🔊 TTS
└────────┬─────────┘  + optional Gemini 1.5 Flash (key in memory only)
         ▼
┌──────────────────┐  FHIR R4 Bundle: Patient(ABHA id) + Observation(LOINC) +
│ ABDM/FHIR export │  MedicationRequest + Condition(ICD-10+SNOMED) + DocumentReference
└──────────────────┘  Mock ABHA (OTP 123456) + mock import. Export/import JSON.
```

Self-check: `js/selftest.js` runs 6 samples + FHIR bundle → 7/7. Matrix: `sample-data/07-master-test-matrix.csv` (46 checks).

## ABDM readiness (decided early — shapes schema)

| Concern | Choice |
|---|---|
| Base | FHIR R4, NRKES/ABDM profiles in `meta.profile` |
| Identity | `Patient.identifier[system=http://abdm.gov.in/abha]` + local fallback |
| Terminology | LOINC labs, ICD-10 + SNOMED conditions, RxNorm-ready meds |
| Consent | Mock consent + OTP + import note; prod → consent-manager + gateway `auth/init→confirm→fetch` |
| Storage | `localStorage` proto; prod → encrypted vault + HIE gateway |
| Safety | Hedged wording, no dose changes, emergency + disclaimer, borderline vs high |

Real ABDM point: replace `abhaVerify`/`abhaImport` in `js/app.js`; bundle shape already conforms.

## File map (all buttons live)

- `index.html` — 5 tabs: Summary / Review (+badge) / Data / Timeline / FHIR + judge banner + skip-link + dialogs
- `js/ocr.js` — pdf.js + Tesseract + progress
- `js/reference.js` — ranges+LOINC, meds, ICD-10/SNOMED map (4-lang meanings)
- `js/extractor.js` — extraction + confidence/span/needsReview
- `js/app.js` — state, Review gate, conflicts, trends, audio, ABHA mock, persistence
- `js/summarizer.js` — 4-lang + Gemini optional; `js/fhir.js` — bundle + ABHA id + date fix
- `js/i18n.js`, `js/samples.js`, `js/selftest.js` — UI strings, 6 demos, 7/7 tests
- `css/styles.css` — premium tokens, focus-visible, reduced-motion, responsive, print
- `slides.html` — 5-slide deck (print to PDF) · `sample-data/` — 6 files + matrix + PNG/PDF generator
- `docs/` — ARCHITECTURE + diagram SVG + EVALUATION_NOTES + DEMO_SCRIPT + TRUST_CARD

## Privacy & safety (judges check)

No backend/tracking; Gemini key in memory only. Uncertain never auto-saves. Abnormal vs borderline distinct. Negation handled.

## Round 2 scale

RxNorm normalization, Indic handwriting model, HAPI FHIR + ABDM sandbox, reminders, caregiver consent-share, risk trends.
