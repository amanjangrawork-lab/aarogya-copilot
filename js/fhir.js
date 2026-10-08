/* ABDM-ready FHIR R4 builder + mock ABHA utilities.
   Profile: Patient.identifier = ABHA (system http://abdm.gov.in/abha),
   Observations carry LOINC, Conditions carry ICD-10 + SNOMED CT. */

function getProfile() {
  try { return JSON.parse(localStorage.getItem("ac_profile") || "{}"); }
  catch { return {}; }
}
function saveProfile(p) { localStorage.setItem("ac_profile", JSON.stringify(p)); }

function mockAbhaId() {
  const n = () => Math.floor(1000 + Math.random() * 9000);
  return `${String(n()).slice(0, 2)}-${n()}-${n()}-${n()}`.replace(/(\d{2})-/, "$1-");
}

/* Indian records use DD/MM/YYYY; JS Date parses that as MM/DD/YYYY.
   Parse DD/MM/YYYY explicitly so FHIR dates + timeline order stay correct. */
function parseRecordDate(s) {
  if (!s) return new Date();
  const m = String(s).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yy = parseInt(m[3], 10);
    if (yy < 100) yy += 2000;
    if (mm > 12 && dd <= 12) { const t = dd; dd = mm; mm = t; } // tolerate MM/DD input
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return new Date(Date.UTC(yy, mm - 1, dd));
  }
  const d = new Date(s);
  return isNaN(d) ? new Date() : d;
}

function buildFhirBundle(profile, records) {
  const pid = "patient-1";
  const bundle = {
    resourceType: "Bundle", type: "collection",
    timestamp: new Date().toISOString(),
    meta: { profile: ["https://nrces.in/ndhm/fhir/r4/Bundle"], tag: [{ system: "http://abdm.gov.in", code: "ABDM", display: "ABDM FHIR R4" }] },
    entry: [],
  };
  const patient = {
    resourceType: "Patient", id: pid,
    meta: { profile: ["https://nrces.in/ndhm/fhir/r4/Patient"] },
    identifier: [
      ...(profile.abha ? [{ system: "http://abdm.gov.in/abha", value: profile.abha, assigner: { display: "ABDM ABHA" } }] : []),
      { system: "http://aarogya-copilot/local", value: "LOCAL-" + (profile.phoneLast4 || "0000") },
    ],
    name: [{ text: profile.name || "Patient" }],
    gender: (profile.gender || "unknown").toLowerCase(),
    birthDate: profile.dob || undefined,
    telecom: profile.phone ? [{ system: "phone", value: profile.phone }] : [],
  };
  bundle.entry.push({ resource: patient });

  records.forEach((rec, i) => {
    const date = (rec.dates && rec.dates[0]) || rec.createdAt.slice(0, 10);
    const isoDate = parseRecordDate(date).toISOString();
    rec.labs.forEach((l, j) => {
      bundle.entry.push({ resource: {
        resourceType: "Observation", id: `obs-${i}-${j}`,
        meta: { profile: ["https://nrces.in/ndhm/fhir/r4/Observation"] },
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: l.loinc || "unknown", display: l.test }], text: l.test },
        subject: { reference: "Patient/" + pid },
        effectiveDateTime: isoDate,
        valueQuantity: typeof l.value === "number" ? { value: l.value, unit: l.unit } : undefined,
        valueString: typeof l.value !== "number" ? String(l.value) + " " + l.unit : undefined,
        interpretation: l.flag !== "normal" ? [{ text: l.flag }] : [],
      }});
    });
    rec.medicines.forEach((m, j) => {
      bundle.entry.push({ resource: {
        resourceType: "MedicationRequest", id: `med-${i}-${j}`,
        meta: { profile: ["https://nrces.in/ndhm/fhir/r4/MedicationRequest"] },
        status: "active", intent: "order",
        medicationCodeableConcept: { text: `${m.name} ${m.dosage}` },
        subject: { reference: "Patient/" + pid },
        dosageInstruction: [{ text: `${m.frequency}${m.duration ? ", " + m.duration : ""}` }],
        authoredOn: isoDate,
      }});
    });
    rec.diagnoses.forEach((d, j) => {
      bundle.entry.push({ resource: {
        resourceType: "Condition", id: `cond-${i}-${j}`,
        meta: { profile: ["https://nrces.in/ndhm/fhir/r4/Condition"] },
        clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
        code: { coding: [
          { system: "http://hl7.org/fhir/sid/icd-10", code: d.code, display: d.display },
          { system: "http://snomed.info/sct", code: d.snomed, display: d.display },
        ], text: d.display },
        subject: { reference: "Patient/" + pid },
      }});
    });
    bundle.entry.push({ resource: {
      resourceType: "DocumentReference", id: "doc-" + i,
      status: "current", type: { text: rec.docType },
      subject: { reference: "Patient/" + pid },
      date: isoDate,
      description: rec.fileName,
      content: [{ attachment: { contentType: "text/plain", data: btoa(unescape(encodeURIComponent(rec.text.slice(0, 60000)))) } }],
    }});
  });
  return bundle;
}

/* Lightweight FHIR R4 validity check for the in-app badge (fhir-developer skill rules:
   required fields = cardinality 1..x; enums validated; OperationOutcome-style gap list). */
function validateFhirBundle(bundle) {
  const gaps = [];
  const entries = (bundle && bundle.entry) || [];
  const patients = entries.filter(e => e.resource && e.resource.resourceType === "Patient");
  if (!patients.length) gaps.push("Missing Patient resource");
  else if (!((patients[0].resource.identifier || []).length)) gaps.push("Patient.identifier (ABHA) missing");
  entries.forEach((e, i) => {
    const r = e.resource || {};
    const where = `${r.resourceType || "?"}[${i}]`;
    if (r.resourceType === "Observation") {
      if (!r.status) gaps.push(`${where}: status required`);
      if (!r.code) gaps.push(`${where}: code required`);
    }
    if (r.resourceType === "MedicationRequest") {
      if (!r.status) gaps.push(`${where}: status required`);
      if (!r.intent) gaps.push(`${where}: intent required`);
      if (!r.medicationCodeableConcept && !r.medicationReference) gaps.push(`${where}: medication[x] required`);
      if (!r.subject) gaps.push(`${where}: subject required`);
    }
    if (r.resourceType === "Condition" && !r.subject) gaps.push(`${where}: subject required`);
    if (r.resourceType === "Bundle") gaps.push(`${where}: nested Bundle not expected`);
  });
  return { valid: gaps.length === 0, gaps: gaps.slice(0, 8), count: entries.length };
}
