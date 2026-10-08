const SAMPLES = [
{
id: "rx", label: "Prescription — Diabetes + BP",
text: `CityCare Clinic, Hyderabad — Dr. Anitha Rao, MD
Date: 12/03/2026  Patient: Ramesh Kumar, 52y M
Diagnosis: Type 2 Diabetes Mellitus, Essential Hypertension
Rx:
1. Tab. Metformin 500mg — 1-0-1 after food x 30 days
2. Tab. Glimepiride 1mg — 1-0-0 before breakfast x 30 days
3. Tab. Amlodipine 5mg — 0-0-1 at bedtime x 30 days
4. Tab. Atorvastatin 10mg — 0-0-1 HS x 30 days
Advice: Low salt, low sugar diet, 30 min walk daily. Review after 1 month with FBS, PPBS, HbA1c.
Next visit: 12/04/2026`
},
{
id: "lab", label: "Lab — CBC + HbA1c + Lipid",
text: `Apollo Diagnostics, Hyderabad  Date: 10/03/2026  Patient: Ramesh Kumar 52/M
CBC:
Hemoglobin 11.2 g/dL (Ref 13-17) LOW
WBC 11200 /uL (Ref 4000-11000) HIGH
Platelets 165000 /uL (Ref 150000-450000)
HbA1c 7.8 % (Ref <5.7 normal; 5.7-6.4 prediabetes; >=6.5 diabetes) HIGH
Fasting Blood Sugar 142 mg/dL (Ref 70-100) HIGH
Total Cholesterol 228 mg/dL (Ref <200) HIGH
LDL 148 mg/dL (Ref <100) HIGH
HDL 38 mg/dL (Ref >40) LOW
Triglycerides 190 mg/dL (Ref <150) HIGH
Creatinine 1.1 mg/dL (Ref 0.6-1.2) normal
Impression: Poor glycemic control, dyslipidemia, mild anemia. Advise physician review.`
},
{
id: "discharge", label: "Discharge — Viral fever",
text: `Sunshine Hospital, Secunderabad — Discharge Summary
Patient: Ramesh Kumar, 52M  DOA: 02/02/2026  DOD: 05/02/2026
Diagnosis: Acute viral febrile illness, Hypertension, Type 2 Diabetes Mellitus
Course: Presented with fever 102F, body ache x 3 days. Dengue NS1 negative. Managed with Paracetamol 650mg TDS, IV fluids, Ondansetron 4mg SOS. Sugar monitored, BP 140/90 on admission, settled to 128/82.
Discharge meds: Tab Paracetamol 650mg SOS, Tab Pantoprazole 40mg OD x 5 days, continue Metformin, Amlodipine.
Advice: Rest 5 days, fluids, soft diet, monitor temperature/BP/sugar, review in OPD after 7 days or earlier if breathlessness/chest pain.`
},
{
id: "diagnostic", label: "Diagnostic — X-ray + ECG + USG",
text: `City Imaging Centre, Hyderabad — Diagnostic Report
Date: 18/03/2026  Patient: Ramesh Kumar, 52y M  Ref: Dr. Anitha Rao
1. CHEST X-RAY (PA view)
Finding: Lungs clear, no consolidation. Cardiac silhouette normal.
Impression: Normal chest X-ray. No acute abnormality.
2. ECG (12-lead, 18/03/2026)
Finding: Normal sinus rhythm, HR 78 bpm. PR/QRS/QT normal. ST-T no acute change.
BP at time of ECG: 138/88 mmHg
Impression: Normal ECG. Borderline high BP — correlate clinically.
3. ULTRASOUND ABDOMEN (USG)
Liver: Normal size, mild fatty change (Grade I). Gall bladder normal.
Kidneys: Both normal in size, no stone.
Impression: Mild fatty liver. Advise lipid control, review with Total Cholesterol 228, Triglycerides 190 reports dated 10/03/2026.
Diagnosis: Essential Hypertension, Hyperlipidemia (Dyslipidemia)
Advice: Continue Amlodipine 5mg OD, Atorvastatin 10mg OD. Cardiology review if chest pain/breathlessness.
Next review: 25/03/2026`
},
{
id: "rx2", label: "Prescription — Asthma + Thyroid",
text: `SmileCare Clinic, Secunderabad — Dr. Kavitha Nair, MD
Date: 15-Mar-2026  Patient: Sunita Sharma, 38y F
Diagnosis: Hypothyroidism, Bronchial Asthma, Gastritis / GERD
Rx:
1. Tab. Thyroxine 50mcg — 1-0-0 OD before breakfast x 30 days
2. Tab. Montelukast 10mg — 0-0-1 HS x 30 days
3. Tab. Pantoprazole 40mg — 1-0-0 OD before food x 14 days
4. Tab. Levocetirizine 5mg — 0-0-1 SOS for cold/cough x 10 days
5. Inhaler Foracort 200mcg — 2 puffs BD x 30 days
Advice: Take Thyroxine empty stomach with water. Avoid dust/cold. Warm fluids.
Investigations advised: TSH retest on 22-Mar-2026.
Next visit: 15-Apr-2026`
},
{
id: "lab2", label: "Lab — Thyroid + Vitamin D",
text: `ThyroCare Labs, Hyderabad  Date: 22-Mar-2026  Patient: Sunita Sharma 38/F
Ref: Dr. Kavitha Nair
Thyroid:
TSH 8.2 uIU/mL (Ref 0.4-4.0) HIGH — suggests underactive thyroid
Vitamin D (25-OH) 18 ng/mL (Ref 30-100) LOW — deficiency
CBC:
Hemoglobin 12.8 g/dL (Ref 12-16) normal
WBC 8200 /uL (Ref 4000-11000) normal
Platelets 245000 /uL (Ref 150000-450000) normal
Sugar:
Fasting Blood Sugar 96 mg/dL (Ref 70-100) normal
PPBS 178 mg/dL (Ref 70-140) HIGH — impaired tolerance
Creatinine 0.9 mg/dL (Ref 0.6-1.2) normal
Vitals at collection: BP 118/76 mmHg, Weight 64 kg
Impression: Hypothyroidism, Vitamin D deficiency, borderline high post-meal sugar. Advise physician review.
Next test: 22-Apr-2026`
}
];
