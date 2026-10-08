# Architecture — Aarogya Copilot

Offline-first, zero-backend static app. Everything runs in the browser; data stays in `localStorage`.

## Pipeline

```
[ PDF / JPG / PNG / pasted text ]
        │
        ▼
┌──────────────────┐   pdf.js text layer (fast path for digital PDFs)
│  Ingest + OCR    │── Tesseract.js fallback (scans/photos, eng + selectable hin/tel/tam)
└────────┬─────────┘   progress bar; scanned-PDF page rendered to canvas then OCR
         ▼ raw text
┌──────────────────┐
│ Rule-based        │  • medicines: COMMON_MEDICINES + Tab/Cap/Syp regex + dose/freq/duration
│ extractor (JS)    │  • labs: LAB_REFERENCE (14 tests, LOINC) + BP 120/80 pattern
└────────┬─────────┘  • diagnoses: ICD-10/SNOMED keyword map  • dates  • doc-type classifier
         ▼ structured record JSON
┌──────────────────┐
│ Summarizer        │  • offline templates (EN/HI/TE/TA): headline, flagged values + meanings,
│ (4 languages)     │    meds, questions-to-ask-doctor, next steps, disclaimer
└────────┬─────────┘  • optional Gemini 1.5 Flash enhancement (user key, never required)
         ▼
┌──────────────────┐  Unified profile + chronological timeline (records + wellness logs)
│ Profile/Timeline │  Wellness manual entry (BP/sugar/weight)
└────────┬─────────┘
         ▼
┌──────────────────┐  FHIR R4 Bundle: Patient(ABHA identifier) + Observation(LOINC) +
│ ABDM/FHIR export │  MedicationRequest + Condition(ICD-10+SNOMED CT) + DocumentReference
└──────────────────┘  Mock ABHA link (OTP 123456) + mock ABDM import. Export/import JSON.
```

## ABDM readiness (decided early — shapes the schema)

| Concern | Choice |
|---|---|
| Base standard | FHIR R4, NRKES/ABDM profiles in `meta.profile` |
| Identity | `Patient.identifier[system=http://abdm.gov.in/abha]` + local fallback |
| Terminology | LOINC for labs, ICD-10 + SNOMED CT for conditions |
| Consent | Mock consent screen + note; production would add ABDM consent-manager + gateway calls |
| Storage | Browser `localStorage` for prototype; production → encrypted vault + HIE gateway |

Real ABDM integration point: replace `abhaVerify`/`abhaImport` stubs in `js/app.js` with
ABDM `auth/init → confirm → fetch-records` calls; the FHIR bundle shape already conforms.

## File map

- `index.html` — tabs: Simple summary / Extracted data / Health timeline / ABHA & FHIR
- `js/ocr.js` — pdf.js + Tesseract
- `js/reference.js` — lab ranges + LOINC, medicine list, ICD-10/SNOMED map
- `js/extractor.js` — regex/NLP extraction
- `js/summarizer.js` — 4-language plain-language + Gemini optional
- `js/fhir.js` — FHIR R4 bundle + mock ABHA id
- `js/i18n.js`, `js/app.js`, `js/samples.js`
- `slides.html` — 5-slide demo deck (print to PDF for submission)
- `sample-data/` — 3 judge-ready records

## Privacy & safety

- No backend, no tracking; optional Gemini key stays in browser memory.
- Hedged wording ("may suggest", "talk to doctor"), no dose changes, emergency + disclaimer banners.
- Abnormal flags use standard reference ranges; borderline vs high distinguished.

## What would scale in Round 2

RxNorm-drug normalization, Indic handwriting model, FHIR server (HAPI) + ABDM sandbox,
care-plan reminders, caregiver sharing via consent, longitudinal risk trends.
