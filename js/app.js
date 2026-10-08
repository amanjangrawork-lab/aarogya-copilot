/* Main app: state, rendering, tabs, timeline, ABHA mock, persistence. No build step. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let state = {
  lang: localStorage.getItem("ac_lang") || "en",
  records: JSON.parse(localStorage.getItem("ac_records") || "[]"),
  wellness: JSON.parse(localStorage.getItem("ac_wellness") || "[]"),
  profile: {},
  activeTab: "summary",
  gemini: "", // ephemeral by design — never persisted
  geminiNote: "",
  ocrLang: localStorage.getItem("ac_ocrLang") || "eng",
};
try { state.profile = JSON.parse(localStorage.getItem("ac_profile") || "{}"); } catch { state.profile = {}; }

function persist() {
  localStorage.setItem("ac_records", JSON.stringify(state.records));
  localStorage.setItem("ac_wellness", JSON.stringify(state.wellness));
  localStorage.setItem("ac_lang", state.lang);
  localStorage.setItem("ac_ocrLang", state.ocrLang || "eng");
  saveProfile(state.profile);
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(state.lang, el.dataset.i18n); });
  $("#langSel").value = state.lang;
  renderAll();
}

function flagBadge(flag) {
  if (flag === "high" || flag === "low") return `<span class="badge bad">${flag === "high" ? "▲ High" : "▼ Low"}</span>`;
  if (flag === "borderline") return `<span class="badge warn">Borderline</span>`;
  return `<span class="badge ok">Normal</span>`;
}

function docIcon(dt) {
  return dt === "lab_report" ? "🧪" : dt === "prescription" ? "💊" : dt === "discharge_summary" ? "🏥" : "📄";
}

/* ---------- renderers ---------- */
function renderProfile() {
  const p = state.profile;
  $("#profileCard").innerHTML = `
    <div class="p-row"><strong>${escapeHtml(p.name || "Guest User")}</strong>
      <span class="abha ${p.abha ? "linked" : ""}">${p.abha ? "🟢 ABHA " + escapeHtml(p.abha) : "⚪ ABHA not linked"}</span></div>
    <div class="p-sub">${escapeHtml([p.age ? p.age + "y" : "", p.gender || "", p.phone || ""].filter(Boolean).join(" · ") || "Set up profile →")}</div>
    <div class="p-stats">
      <div><b>${state.records.length}</b><span>records</span></div>
      <div><b>${state.records.reduce((a, r) => a + r.medicines.length, 0)}</b><span>medicines</span></div>
      <div><b>${state.records.flatMap(r => r.labs).filter(l => l.flag !== "normal").length}</b><span>flags</span></div>
    </div>`;
}

function renderSummary() {
  const box = $("#summaryBox");
  if (!state.records.length) {
    box.innerHTML = `<div class="empty">📤 <b>No records yet.</b><br>Upload a prescription/lab PDF or photo, paste text, or load the 1-click demo data above to see the AI summary here.</div>`;
    $("#geminiBox").innerHTML = ""; return;
  }
  const rec = state.records[state.records.length - 1];
  const s = buildLocalSummary(rec, state.lang);
  const abn = rec.labs.filter(l => l.flag !== "normal");
  box.innerHTML = `
    <div class="rec-head">${docIcon(rec.docType)} <b>${escapeHtml(rec.fileName)}</b>
      <span class="dtype">${escapeHtml((DOC_LABEL[rec.docType] || DOC_LABEL.general_record)[state.lang] || rec.docType)}</span>
      <span class="date">${escapeHtml((rec.dates[0] || rec.createdAt.slice(0, 10)))}</span></div>
    <p class="headline">${escapeHtml(s.headline)}</p>
    <h4>${escapeHtml(SECTION_TITLE.abnormal[state.lang])} (${abn.length || rec.labs.length ? (abn.length + " flagged / " + rec.labs.length + " measured") : "none"})</h4>
    ${rec.labs.length ? `<ul class="vals">${rec.labs.map(l => `<li>${flagBadge(l.flag)} <b>${escapeHtml(l.test)}</b> — ${escapeHtml(String(l.value))} ${escapeHtml(l.unit)} <span class="ref">(usual ${escapeHtml(String(l.low))}–${escapeHtml(String(l.high))})</span><br><span class="mean">${escapeHtml((l.meaning && (l.meaning[state.lang] || l.meaning.en)) || "")}</span></li>`).join("")}</ul>` : `<p class="muted">No numeric lab values found in this record.</p>`}
    <h4>${escapeHtml(SECTION_TITLE.meds[state.lang])}</h4>
    ${rec.medicines.length ? `<ul class="meds">${rec.medicines.map(m => `<li>💊 <b>${escapeHtml(m.name)}</b> ${escapeHtml(m.dosage)} · ${escapeHtml(m.frequency)}${m.duration ? " · " + escapeHtml(m.duration) : ""}</li>`).join("")}</ul><p class="muted">Take exactly as prescribed. Never start, stop, or change a dose without your doctor.</p>` : `<p class="muted">No medicines detected in this record.</p>`}
    <h4>${escapeHtml(SECTION_TITLE.ask[state.lang])}</h4>
    <ol class="ask">${s.ask.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ol>
    <h4>${escapeHtml(SECTION_TITLE.next[state.lang])}</h4>
    <ul class="next">${s.next.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
    <div class="disclaimer">⚠️ ${escapeHtml(s.disclaimer)}</div>`;
  // Gemini optional
  const g = $("#geminiBox");
  if (state.geminiNote) g.innerHTML = `<div class="gemini"><h4>✨ Gemini AI explanation</h4><p>${escapeHtml(state.geminiNote)}</p></div>`;
  else if (state.gemini) g.innerHTML = `<button class="btn small" id="enhanceBtn">✨ Enhance with Gemini</button>`;
  else g.innerHTML = `<p class="muted">Tip: add a free Gemini API key in Settings to get a second AI explanation alongside the offline one.</p>`;
  const eb = $("#enhanceBtn");
  if (eb) eb.onclick = async () => {
    eb.disabled = true; eb.textContent = "Thinking…";
    const extra = await enhanceWithGemini(rec, s, state.gemini);
    state.geminiNote = extra || "Gemini unavailable (check key/network). Offline summary above still applies.";
    persist(); renderSummary();
  };
}

function renderData() {
  const box = $("#dataBox");
  if (!state.records.length) { box.innerHTML = `<div class="empty">Nothing extracted yet.</div>`; return; }
  box.innerHTML = state.records.map((rec, idx) => `
    <div class="card">
      <div class="rec-head">${docIcon(rec.docType)} <b>${escapeHtml(rec.fileName)}</b>
        <button class="btn danger small" data-del="${idx}">Delete</button></div>
      <div class="muted small">${escapeHtml([rec.facility, rec.doctor ? "Dr. " + rec.doctor : "", (rec.dates[0] || "")].filter(Boolean).join(" · ") || rec.createdAt.slice(0, 10))}</div>
      ${rec.diagnoses.length ? `<p><b>Diagnoses:</b> ${rec.diagnoses.map(d => `${escapeHtml(d.display)} <span class="code">${d.code}</span>`).join(", ")}</p>` : ""}
      ${rec.medicines.length ? `<table><thead><tr><th>Medicine</th><th>Dose</th><th>Schedule</th></tr></thead><tbody>${rec.medicines.map(m => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.dosage)}</td><td>${escapeHtml(m.frequency)}${m.duration ? " · " + escapeHtml(m.duration) : ""}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No medicines found.</p>`}
      ${rec.labs.length ? `<table><thead><tr><th>Test</th><th>Value</th><th>Range</th><th>Status</th></tr></thead><tbody>${rec.labs.map(l => `<tr><td>${escapeHtml(l.test)} <span class="code">${l.loinc || ""}</span></td><td>${escapeHtml(String(l.value))} ${escapeHtml(l.unit)}</td><td>${escapeHtml(String(l.low))}–${escapeHtml(String(l.high))}</td><td>${flagBadge(l.flag)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No lab values found.</p>`}
      <details><summary>Original text (OCR)</summary><pre class="ocr">${escapeHtml(rec.text.slice(0, 3000))}</pre></details>
    </div>`).join("");
  $$("#dataBox [data-del]").forEach(b => b.onclick = () => {
    state.records.splice(+b.dataset.del, 1); state.geminiNote = ""; persist(); renderAll();
  });
}

function renderTimeline() {
  const box = $("#timelineBox");
  const events = [
    ...state.records.map(r => ({ date: (r.dates[0] || r.createdAt.slice(0, 10)), icon: docIcon(r.docType), title: r.fileName, sub: `${r.diagnoses.map(d => d.display).join(", ") || r.docType} · ${r.medicines.length} meds · ${r.labs.filter(l => l.flag !== "normal").length} flags` })),
    ...state.wellness.map(w => ({ date: w.date, icon: "❤️", title: `Wellness — BP ${w.bp || "–"}, Sugar ${w.sugar || "–"}, Wt ${w.wt || "–"}`, sub: w.note || "" })),
  ].sort((a, b) => {
    try { return parseRecordDate(a.date) - parseRecordDate(b.date); }
    catch { return String(a.date).localeCompare(String(b.date)); }
  });
  if (!events.length) { box.innerHTML = `<div class="empty">Your unified timeline will appear here — records + wellness logs in one place.</div>`; return; }
  box.innerHTML = `<div class="timeline">${events.map(e => `<div class="t-item"><div class="t-dot">${e.icon}</div><div><b>${escapeHtml(e.title)}</b><div class="muted small">${escapeHtml(e.date)} · ${escapeHtml(e.sub)}</div></div></div>`).join("")}</div>`;
}

function renderFhir() {
  const bundle = buildFhirBundle(state.profile, state.records);
  $("#fhirMeta").innerHTML = `
    <div class="fhir-grid">
      <div><b>Resources:</b> ${bundle.entry.length} (Patient ×1, Observations ×${bundle.entry.filter(e => e.resource.resourceType === "Observation").length}, MedicationRequests ×${bundle.entry.filter(e => e.resource.resourceType === "MedicationRequest").length}, Conditions ×${bundle.entry.filter(e => e.resource.resourceType === "Condition").length})</div>
      <div><b>Standards:</b> FHIR R4 · LOINC · ICD-10 · SNOMED CT · ABDM NRKES profiles</div>
      <div><b>ABHA:</b> ${state.profile.abha ? escapeHtml(state.profile.abha) + " (mock linked)" : "not linked — use Link ABHA"}</div>
    </div>`;
  $("#fhirJson").textContent = JSON.stringify(bundle, null, 2);
}

function renderAll() { renderProfile(); renderSummary(); renderData(); renderTimeline(); renderFhir(); }

/* ---------- actions ---------- */
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

async function handleFiles(files) {
  const bar = $("#ocrBar"), status = $("#status");
  for (const f of files) {
    try {
      status.textContent = "Reading " + f.name + "…"; bar.style.width = "15%";
      const txt = await extractTextFromFile(f, p => { bar.style.width = (15 + p * 70) + "%"; }, state.ocrLang || "eng");
      if (!txt || txt.trim().length < 10) throw new Error("No text found. Try a clearer photo or paste the text.");
      addRecord(txt, f.name);
      bar.style.width = "100%"; status.textContent = "Done: " + f.name;
    } catch (e) { status.textContent = "⚠️ " + f.name + ": " + e.message; }
  }
  setTimeout(() => { bar.style.width = "0%"; }, 1200);
}

function addRecord(text, name) {
  const rec = extractRecord(text, name);
  state.records.push(rec); state.geminiNote = "";
  persist(); renderAll();
  switchTab("summary");
  $("#status").textContent = `Extracted: ${rec.medicines.length} medicines, ${rec.labs.length} lab values, ${rec.diagnoses.length} diagnoses.`;
}

function switchTab(name) {
  state.activeTab = name;
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  ["summary", "data", "timeline", "fhir"].forEach(k => $("#tab-" + k).hidden = (k !== name));
}

function wire() {
  $("#langSel").onchange = e => { state.lang = e.target.value; persist(); applyLang(); };
  $$(".tab").forEach(b => b.onclick = () => switchTab(b.dataset.tab));

  const dz = $("#drop");
  dz.onclick = () => $("#fileInput").click();
  $("#fileInput").onchange = e => handleFiles([...e.target.files]);
  ["dragover", "dragenter"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => handleFiles([...e.dataTransfer.files]));

  $("#analyzeBtn").onclick = () => {
    const tx = $("#pasteBox").value.trim();
    if (!tx) { $("#status").textContent = "Paste some report text first, or upload a file."; return; }
    addRecord(tx, "pasted-text"); $("#pasteBox").value = "";
  };
  $$("#demoBtns button").forEach(b => b.onclick = () => {
    const s = SAMPLES.find(x => x.id === b.dataset.sample);
    addRecord(s.text, s.label + ".txt");
  });
  $("#clearBtn").onclick = () => {
    if (!confirm("Delete all records on this device?")) return;
    state.records = []; state.wellness = []; state.geminiNote = ""; persist(); renderAll();
  };

  // profile modal
  $("#profileBtn").onclick = () => $("#profileModal").showModal();
  $("#saveProfile").onclick = () => {
    state.profile = {
      ...state.profile,
      name: $("#fName").value.trim(), age: $("#fAge").value.trim(),
      gender: $("#fGender").value, phone: $("#fPhone").value.trim(),
      dob: $("#fDob").value, lang: state.lang,
      phoneLast4: ($("#fPhone").value.trim().slice(-4) || "0000"),
    };
    persist(); renderAll(); $("#profileModal").close();
  };

  // ABHA mock link (OTP 123456)
  $("#abhaBtn").onclick = () => $("#abhaModal").showModal();
  $("#abhaSend").onclick = () => {
    const ph = $("#abhaPhone").value.trim();
    if (ph.replace(/\D/g, "").length < 10) { $("#abhaMsg").textContent = "Enter a 10-digit mobile number."; return; }
    $("#abhaMsg").textContent = "Mock OTP sent: 123456 (demo only — no real SMS).";
    $("#abhaOtpRow").hidden = false;
  };
  $("#abhaVerify").onclick = () => {
    if ($("#abhaOtp").value.trim() !== "123456") { $("#abhaMsg").textContent = "Wrong OTP for demo. Hint: 123456."; return; }
    state.profile.abha = state.profile.abha || mockAbhaId();
    state.profile.phone = $("#abhaPhone").value.trim();
    state.profile.phoneLast4 = state.profile.phone.slice(-4);
    persist(); renderAll(); $("#abhaModal").close();
    $("#status").textContent = "ABHA linked (mock): " + state.profile.abha;
  };
  $("#abhaImport").onclick = () => {
    // simulate ABDM gateway import: adds a mock record
    addRecord(SAMPLES[1].text, "ABHA-import (mock) — Lab 10/03/2026.txt");
    $("#status").textContent = "Imported 1 mock record via ABHA gateway (demo).";
  };

  $("#exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(buildFhirBundle(state.profile, state.records), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "aarogya-fhir-bundle.json"; a.click();
  };
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = async e => {
    try {
      const j = JSON.parse(await e.target.files[0].text());
      const txt = (j.entry || []).map(en => en.resource?.code?.text || en.resource?.medicationCodeableConcept?.text || "").join("\n");
      if (txt.trim()) addRecord(txt, "fhir-import.txt");
      else $("#status").textContent = "FHIR file had no readable entries.";
    } catch { $("#status").textContent = "Could not parse that JSON file."; }
  };

  // wellness
  $("#wellBtn").onclick = () => $("#wellModal").showModal();
  $("#saveWell").onclick = () => {
    state.wellness.push({ date: $("#wDate").value || new Date().toISOString().slice(0, 10), bp: $("#wBp").value.trim(), sugar: $("#wSugar").value.trim(), wt: $("#wWt").value.trim(), note: $("#wNote").value.trim() });
    persist(); renderAll(); $("#wellModal").close(); switchTab("timeline");
  };

  // settings / gemini
  $("#settingsBtn").onclick = () => {
    $("#gemKey").value = state.gemini || "";
    $("#ocrLang").value = state.ocrLang || "eng";
    $("#setModal").showModal();
  };
  $("#saveSet").onclick = () => {
    state.gemini = $("#gemKey").value.trim(); state.ocrLang = $("#ocrLang").value;
    state.geminiNote = ""; persist(); $("#setModal").close(); renderSummary();
  };
  $("#printBtn").onclick = () => window.print();
}

document.addEventListener("DOMContentLoaded", () => {
  $("#fName").value = state.profile.name || ""; $("#fAge").value = state.profile.age || "";
  $("#fGender").value = state.profile.gender || "other"; $("#fPhone").value = state.profile.phone || "";
  $("#fDob").value = state.profile.dob || "";
  // seed profile name from samples for nicer demo if empty
  wire(); applyLang(); switchTab("summary");
  if (typeof pdfjsLib !== "undefined" && pdfjsLib.GlobalWorkerOptions)
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
});
