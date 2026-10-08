# Sample data — OCR + extraction test pack

Synthetic (fake) data only. No real patient info. Safe to upload anywhere.

## Files

| File | Type | Covers |
|---|---|---|
| `01-prescription.txt` (+ .png/.pdf after generating) | Prescription | Medicines ×4 (Metformin, Glimepiride, Amlodipine, Atorvastatin), dosages (mg, 1-0-1, OD/HS), diagnoses (T2DM E11, Hypertension I10), dates (12/03/2026, 12/04/2026) |
| `02-lab-report.txt` | Lab report | Test values ×9 (Hb, WBC, Platelets, HbA1c, FBS, Cholesterol, LDL, HDL, Triglycerides, Creatinine) with HIGH/LOW flags, date 10/03/2026 |
| `03-discharge-summary.txt` | Discharge summary | Meds (Paracetamol TDS/SOS, Ondansetron, Pantoprazole), vitals BP 140/90→128/82, DOA 02/02/2026 / DOD 05/02/2026 |
| `04-diagnostic-report.txt` | Diagnostic (X-ray + ECG + USG) | X-ray, ECG with BP 138/88, USG fatty liver, diagnoses (Hypertension, Hyperlipidemia), date 18/03/2026 |
| `05-prescription-asthma-thyroid.txt` | Prescription (2nd patient) | Thyroxine 50mcg, Montelukast, Pantoprazole, Levocetirizine, Foracort inhaler; dates in 15-Mar-2026 format |
| `06-lab-report-thyroid-vitd.txt` | Lab report (2nd patient) | TSH 8.2 HIGH, Vitamin D 18 LOW, PPBS 178 HIGH, BP 118/76; date 22-Mar-2026 |
| `07-master-test-matrix.csv` | Checklist | Every medicine / dosage / test value / diagnosis / date → which file it's in, and what the app should extract |
| `make-ocr-samples.html` | Generator | Open in browser → one click downloads **PNG** (tests Tesseract OCR path) and **PDF** (tests pdf.js text path) for every sample |

## How to test OCR in the project (2 min)

`.txt` files skip OCR (loaded as text). To exercise the real OCR pipeline you need
images and PDFs — generate them locally with no install:

1. Open `sample-data/make-ocr-samples.html` in Chrome/Edge (double-click).
2. Click **⬇ Download all PNG** → drag the PNGs onto the app's drop zone
   (`index.html`) → watch the OCR progress bar → check *Extracted data* tab.
3. Click **⬇ Download all PDF** → drag the PDFs in → these take the fast
   pdf.js text-layer path (no OCR needed).
4. Compare counts against `07-master-test-matrix.csv`:
   e.g. `01-prescription` should give **4 medicines, 2 diagnoses, 2 dates**;
   `02-lab-report` should give **9+ lab values with HIGH/LOW flags**.

Tip: set OCR language in ⚙️ Settings (+ Hindi/Telugu/Tamil) before dropping PNGs.
