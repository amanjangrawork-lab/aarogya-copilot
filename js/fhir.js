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
    rec.labs.forEach((l, j) => {
      bundle.entry.push({ resource: {
        resourceType: "Observation", id: `obs-${i}-${j}`,
        meta: { profile: ["https://nrces.in/ndhm/fhir/r4/Observation"] },
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: l.loinc || "unknown", display: l.test }], text: l.test },
        subject: { reference: "Patient/" + pid },
        effectiveDateTime: new Date(date).toISOString ? new Date(date).toISOString() : new Date().toISOString(),
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
        authoredOn: new Date(date).toISOString ? new Date(date).toISOString() : new Date().toISOString(),
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
      date: new Date().toISOString(),
      description: rec.fileName,
      content: [{ attachment: { contentType: "text/plain", data: btoa(unescape(encodeURIComponent(rec.text.slice(0, 60000)))) } }],
    }});
  });
  return bundle;
}
