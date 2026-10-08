# Demo script (3 minutes)

**0:00 — Hook (20s).** "Patients carry paper files nobody can read. Watch this prescription become plain language in 20 seconds." Open `index.html`.

**0:20 — Upload + OCR (40s).** Click **🧪 Lab report** demo (or drag `sample-data/02-lab-report.txt`, or a real photo to show Tesseract OCR with progress bar). Point out: digital PDFs use pdf.js; photos fall back to Tesseract eng+hin+tel+tam.

**1:00 — AI summary (50s).** Simple-summary tab: headline, 🔴/⚠️/✅ flags, "what HbA1c 7.8% means", medicines, questions-to-ask-doctor. Switch language to हिन्दी → same summary in Hindi. Note disclaimer + safe wording.

**1:50 — Timeline (25s).** Load the other two demos, add one wellness log, show unified chronological timeline.

**2:15 — ABDM/FHIR (35s).** ABHA & FHIR tab: Link ABHA with OTP `123456`, Export FHIR JSON, show Patient/Observation(LOINC)/Condition(ICD-10+SNOMED). Click "Simulate ABHA import".

**2:50 — Close (10s).** "Zero backend, data stays in browser, deploys free to GitHub Pages. ABDM-ready today, gateway-ready tomorrow."

## Judge 60-second path
1. Click **🧪 Lab report** → read summary + flags.
2. Language → हिन्दी.
3. Timeline tab → FHIR tab → Export JSON. Done.
