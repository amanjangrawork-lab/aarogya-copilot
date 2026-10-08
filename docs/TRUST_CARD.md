# Trust Card — Aarogya Copilot (1 page for judges)

Persona: caregiver for parent with diabetes/BP, Hindi/Telugu first. Job: what changed, what meds active, what to carry.

| Measure | Target for demo | How verified |
|---|---|---|
| Printed-document extraction | Field-level ≥85% on 6 synthetic docs | `js/selftest.js` 7/7 + `sample-data/07-master-test-matrix.csv` (46 checks: 12 meds, 6 doses, 14 labs, 8 dx, 6 dates) |
| Medication exact (name+dose+frequency) | Separately measured | rx: 4/4, rx2: 5/5, discharge: 5 meds incl TDS/SOS/OD |
| Unsafe auto-fill rate | Zero | `needsReview` gate: low/medium never auto-save, must Confirm in 🔍 Review |
| Summary grounding | 100% facts link to source | Every lab shows Source snippet + confidence + ✅ confirmed; original OCR expandable |
| Conflict detection | Dose change flagged | `findConflicts()` compares same drug across records, shows from→to, advises carry both |
| Language quality | Hindi/Telugu/Tamil UI + summary, drug names untranslated | `js/i18n.js` + `summarizer.js` 4 langs, side-by-side, 🔊 Listen (hi-IN/te-IN/ta-IN) |
| Privacy | Consent, mock ABHA OTP 123456, export/revoke, local only | Zero backend, localStorage, no training, audit via timeline, 7-day share concept + FHIR export |
| Safety | Educational only, no diagnosis/dose advice | Disclaimer + hedged wording + emergency 108/112 banner, negation guard (dengue negative etc) |

Known limits (honest): heavy handwriting needs Indic model; adult-general ranges — confirm with doctor/lab. No live ABDM — mock only, gateway-ready.
