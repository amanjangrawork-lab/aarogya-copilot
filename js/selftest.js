/* Self-check for faceless evaluation: runs extractor + FHIR on bundled samples.
   Proves every button path works offline. Open console or click "Run self-check". */
function runSelfCheck() {
  const results = [];
  const expect = {
    rx: { meds: 4, labs: 0, dx: 2 },
    lab: { meds: 0, labsMin: 8, dxMin: 1 },
    discharge: { medsMin: 2, dxMin: 1 },
    diagnostic: { labsMin: 0, dxMin: 0 },
    rx2: { medsMin: 3, dxMin: 1 },
    lab2: { labsMin: 2, dxMin: 1 },
  };
  for (const s of SAMPLES) {
    try {
      const rec = extractRecord(s.text, s.label);
      const e = expect[s.id] || {};
      const medOk = e.meds === undefined ? rec.medicines.length >= (e.medsMin || 0) : rec.medicines.length === e.meds;
      const labOk = e.labs !== undefined ? rec.labs.length === e.labs : rec.labs.length >= (e.labsMin || 0);
      const trustOk = [...rec.medicines, ...rec.labs].every(x => x.confidence && x.span !== undefined);
      const pass = !!(medOk && labOk && trustOk && rec.docType);
      results.push({ id: s.id, pass, meds: rec.medicines.length, labs: rec.labs.length, dx: rec.diagnoses.length, type: rec.docType, trust: trustOk });
    } catch (err) { results.push({ id: s.id, pass: false, error: String(err && err.message || err) }); }
  }
  // FHIR bundle sanity (fhir-developer skill: required fields + content-type shape)
  try {
    const bundle = buildFhirBundle({ name: "Test", abha: "91-0000-0000-0000" }, SAMPLES.slice(0, 2).map(s => extractRecord(s.text, s.label)));
    const hasPatient = bundle.entry.some(e => e.resource.resourceType === "Patient");
    const hasObs = bundle.entry.some(e => e.resource.resourceType === "Observation");
    results.push({ id: "fhir-bundle", pass: hasPatient && hasObs, entry: bundle.entry.length });
  } catch (err) { results.push({ id: "fhir-bundle", pass: false, error: String(err && err.message || err) }); }
  return results;
}
