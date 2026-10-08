# Submission draft — copy-paste into the hackathon form

## Project title
**Aarogya Copilot — Trust-Gated AI Health Copilot (ABDM-ready, 4-language)**

## Project description (use as-is)
Aarogya Copilot turns fragmented prescriptions, lab reports, discharge summaries and diagnostic scans into one trustworthy health story for caregivers. Upload PDF/photo or paste text: pdf.js + Tesseract OCR (English+Hindi+Telugu+Tamil, all scanned pages, 10 MB guard) extracts medicines with confidence + source span, 14 LOINC-coded labs with high/low/borderline flags, ICD-10+SNOMED diagnoses, dates and doctor/facility. Uncertain items never auto-save — 🔍 Review gate forces Confirm/Correct with provenance, and dose-changes offer Keep new / Keep earlier with your choice logged. Active meds + lab trend sparklines merge with wellness logs into a searchable, filterable timeline with a full provenance ledger. Offline summarizer explains every abnormal value (“what HbA1c 7.8% means”), lists meds (names never translated), suggests doctor questions — in English, हिन्दी, తెలుగు, தமிழ் with 🔊 listen — plus optional Gemini enhancement, and 🖨️ Print makes a one-page doctor visit sheet. FHIR R4 bundle (ABDM NRKES) carries a ✅ validity badge, mock ABHA link (OTP 123456), mock import and a 7-day revocable share link. Installable PWA, zero backend, fast static app, data stays in browser. Safety-first: educational-only, hedged wording, no dose advice, emergency banner, 11/11 self-check.

## Live application URL
`https://<your-username>.github.io/aarogya-copilot/` ← push this folder → Settings → Pages → main → /root. Verify fast: homepage → 🧪 Lab → 🔍 Review Confirm → Hindi → Timeline trends → FHIR Export. (Vercel/Netlify: no build, output `.`.)

## GitHub repository
`https://github.com/<your-username>/aarogya-copilot` (this folder, ready to push)

## Demo video URL (optional)
Record 3-min Loom/YouTube unlisted per `docs/DEMO_SCRIPT.md`: hook (20s) → upload/OCR (40s) → Review gate (30s) → Hindi + 🔊 (30s) → Timeline trends + active meds (30s) → ABHA/FHIR export + self-check (30s). Backup: `slides.html` → Print to PDF.

## Test access and evaluation notes (paste)
No login, keys, backend needed — fast static app, installable PWA. 60-sec: (1) open URL, (2) 🧪 Lab report → (3) 🔍 Review → Confirm & save (see source spans + low flags), (4) Simple summary (10 labs with meanings + 🔊 + visit-sheet print), (5) हिन्दी switch (drug names unchanged), (6) Timeline (search + filters, active meds + HbA1c trend, provenance ledger in Data tab), (7) ABHA & FHIR → ✅ valid badge → Export JSON → 7-day share link. Click ✅ Run self-check for 11/11 proof. ABHA OTP: 123456. Samples + 46-check matrix: `sample-data/`. Gemini key optional. Limits: handwriting needs Indic model; adult-general ranges — confirm with doctor. Full: `docs/EVALUATION_NOTES.md` + `docs/TRUST_CARD.md`.

## Publish commands (run once)
```bash
git init && git add . && git commit -m "Aarogya Copilot premium: trust-gated, faceless-ready"
gh repo create aarogya-copilot --public --source=. --push
# then enable Pages as above
```
