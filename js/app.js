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
  pending: null, // staged record awaiting human review (trust gate)
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
      <span class="date">${escapeHtml((rec.dates[0] || rec.createdAt.slice(0, 10)))}</span>
      <button class="btn small" id="speakBtn" aria-label="Read summary aloud">🔊 Listen</button></div>
    <p class="headline">${escapeHtml(s.headline)}</p>
    <h4>${escapeHtml(SECTION_TITLE.abnormal[state.lang])} (${abn.length || rec.labs.length ? (abn.length + " flagged / " + rec.labs.length + " measured") : "none"})</h4>
    ${rec.labs.length ? `<ul class="vals">${rec.labs.map(l => `<li>${flagBadge(l.flag)} <b>${escapeHtml(l.test)}</b> — ${escapeHtml(String(l.value))} ${escapeHtml(l.unit)} <span class="ref">(usual ${escapeHtml(String(l.low))}–${escapeHtml(String(l.high))})</span><br><span class="mean">${escapeHtml((l.meaning && (l.meaning[state.lang] || l.meaning.en)) || "")}</span><br><span class="muted small">Source: “${escapeHtml((l.span || "").slice(0, 80))}” · ${l.userConfirmed ? "✅ confirmed by you" : l.confidence + " confidence"}</span></li>`).join("")}</ul>` : `<p class="muted">No numeric lab values found in this record.</p>`}
    <h4>${escapeHtml(SECTION_TITLE.meds[state.lang])}</h4>
    ${rec.medicines.length ? `<ul class="meds">${rec.medicines.map(m => `<li>💊 <b>${escapeHtml(m.name)}</b> ${escapeHtml(m.dosage)} · ${escapeHtml(m.frequency)}${m.duration ? " · " + escapeHtml(m.duration) : ""} <span class="muted small">${m.userConfirmed ? "✅ confirmed" : "· " + m.confidence}</span></li>`).join("")}</ul><p class="muted">Take exactly as prescribed. Never start, stop, or change a dose without your doctor. Drug names never translated.</p>` : `<p class="muted">No medicines detected in this record.</p>`}
    <h4>${escapeHtml(SECTION_TITLE.ask[state.lang])}</h4>
    <ol class="ask">${s.ask.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ol>
    <h4>${escapeHtml(SECTION_TITLE.next[state.lang])}</h4>
    <ul class="next">${s.next.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
    <div class="disclaimer">⚠️ ${escapeHtml(s.disclaimer)}</div>`;
  const spk = $("#speakBtn");
  if (spk) spk.onclick = () => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(s.headline + ". " + abn.map(l => `${l.test} ${l.value} ${l.unit}, ${l.flag}`).join(". "));
      u.lang = state.lang === "hi" ? "hi-IN" : state.lang === "te" ? "te-IN" : state.lang === "ta" ? "ta-IN" : "en-IN";
      speechSynthesis.speak(u);
    } catch { $("#status").textContent = "Audio not supported in this browser."; }
  };
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

function activeMeds() {
  // Latest entry per medicine name = current regimen (reconciliation, not advice).
  const map = new Map();
  const ordered = [...state.records].sort((a, b) => { try { return parseRecordDate(a.dates[0] || a.createdAt) - parseRecordDate(b.dates[0] || b.createdAt); } catch { return 0; } });
  for (const r of ordered) for (const m of r.medicines) map.set(m.name.toLowerCase(), { ...m, from: r.fileName, date: r.dates[0] || r.createdAt.slice(0, 10) });
  return [...map.values()];
}

function labTrends() {
  // Group numeric lab values across records by test key for sparkline trends.
  const groups = {};
  const ordered = [...state.records].sort((a, b) => { try { return parseRecordDate(a.dates[0] || a.createdAt) - parseRecordDate(b.dates[0] || b.createdAt); } catch { return 0; } });
  for (const r of ordered) {
    const d = r.dates[0] || r.createdAt.slice(0, 10);
    for (const l of r.labs) {
      if (typeof l.value !== "number") continue;
      (groups[l.key] = groups[l.key] || { test: l.test, unit: l.unit, low: l.low, high: l.high, points: [] }).points.push({ d, v: l.value, flag: l.flag });
    }
  }
  return Object.values(groups).filter(g => g.points.length >= 1);
}

function sparkline(points, w = 160, h = 44) {
  if (points.length === 1) return `<span class="muted small">1 reading: <b>${points[0].v}</b></span>`;
  const vs = points.map(p => p.v), min = Math.min(...vs), max = Math.max(...vs), span = (max - min) || 1;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(h - 6 - ((p.v - min) / span) * (h - 14)).toFixed(1)}`).join(" ");
  const dots = points.map((p, i) => `<circle cx="${(i * step).toFixed(1)}" cy="${(h - 6 - ((p.v - min) / span) * (h - 14)).toFixed(1)}" r="3.2" fill="${p.flag === "normal" ? "#157347" : "#c0392b"}"><title>${p.d}: ${p.v}</title></circle>`).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trend ${points.map(p => p.v).join(", ")}"><path d="${path}" fill="none" stroke="#0b5ed7" stroke-width="2"/>${dots}</svg>
    <div class="muted small">${points[0].d} → ${points[points.length - 1].d}: <b>${points[0].v} → ${points[points.length - 1].v}</b> ${points[points.length - 1].v > points[0].v ? "▲ rising" : points[points.length - 1].v < points[0].v ? "▼ falling" : "stable"} (info only, not advice)</div>`;
}

function renderTimeline() {
  const box = $("#timelineBox");
  const meds = activeMeds();
  const trends = labTrends();
  const events = [
    ...state.records.map(r => {
      const conf = findConflicts(r).length ? ` · ⚠️ dose changed vs earlier` : "";
      return { date: (r.dates[0] || r.createdAt.slice(0, 10)), icon: docIcon(r.docType), title: r.fileName, sub: `${r.diagnoses.map(d => d.display).join(", ") || r.docType} · ${r.medicines.length} meds · ${r.labs.filter(l => l.flag !== "normal").length} flags${conf}` };
    }),
    ...state.wellness.map(w => ({ date: w.date, icon: "❤️", title: `Wellness — BP ${w.bp || "–"}, Sugar ${w.sugar || "–"}, Wt ${w.wt || "–"}`, sub: w.note || "" })),
  ].sort((a, b) => {
    try { return parseRecordDate(a.date) - parseRecordDate(b.date); }
    catch { return String(a.date).localeCompare(String(b.date)); }
  });
  if (!events.length) { box.innerHTML = `<div class="empty">Your unified timeline will appear here — records + wellness logs in one place.</div>`; return; }
  box.innerHTML = `
    ${meds.length ? `<h4>💊 Currently active medicines (${meds.length}) — latest per name</h4>
    <ul class="meds">${meds.map(m => `<li><b>${escapeHtml(m.name)}</b> ${escapeHtml(m.dosage)} · ${escapeHtml(m.frequency)} <span class="muted small">since ${escapeHtml(m.date)} · ${escapeHtml(m.from)}</span></li>`).join("")}</ul>
    <p class="muted small">Take exactly as prescribed. Never start/stop/change without your doctor.</p>` : ""}
    ${trends.length ? `<h4>📈 Lab trends (across records)</h4>${trends.slice(0, 4).map(g => `<div class="rev-item"><b>${escapeHtml(g.test)}</b> <span class="muted small">usual ${escapeHtml(String(g.low))}–${escapeHtml(String(g.high))} ${escapeHtml(g.unit)}</span><br>${sparkline(g.points)}</div>`).join("")}` : ""}
    <h4>🕒 Unified timeline</h4>
    <div class="timeline">${events.map(e => `<div class="t-item"><div class="t-dot">${e.icon}</div><div><b>${escapeHtml(e.title)}</b><div class="muted small">${escapeHtml(e.date)} · ${escapeHtml(e.sub)}</div></div></div>`).join("")}</div>`;
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

function renderAll() { renderProfile(); renderSummary(); renderData(); renderTimeline(); renderFhir(); renderReview(); }

/* ---------- trust gate: review-before-save + conflict detection ---------- */
function findConflicts(newRec) {
  // Cross-document reconciliation: same medicine, different dose/frequency.
  const conflicts = [];
  for (const m of newRec.medicines) {
    for (const old of state.records) {
      const prev = old.medicines.find(x => x.name.toLowerCase() === m.name.toLowerCase());
      if (prev && (prev.dosage !== m.dosage || prev.frequency !== m.frequency)) {
        conflicts.push({ name: m.name, from: `${prev.dosage} · ${prev.frequency} (${old.fileName})`, to: `${m.dosage} · ${m.frequency} (${newRec.fileName})` });
        break;
      }
    }
  }
  return conflicts;
}

function renderReview() {
  const box = document.querySelector("#reviewBox");
  if (!box) return;
  const p = state.pending;
  if (!p) {
    const n = state.records.length ? state.records[state.records.length - 1] : null;
    const lowCount = n ? [...n.medicines, ...n.labs].filter(x => x.needsReview).length : 0;
    box.innerHTML = `<div class="empty">✅ <b>No pending reviews.</b><br>${n ? `Last record <b>${escapeHtml(n.fileName)}</b> saved with ${lowCount} items needing review.` : "Upload or load a demo to test the trust gate."}<br><span class="muted small">Uncertain medicines/doses never auto-save — you confirm first.</span></div>`;
    const badge = document.querySelector("#reviewBadge"); if (badge) badge.hidden = true;
    return;
  }
  const conflicts = findConflicts(p);
  const badge = document.querySelector("#reviewBadge"); if (badge) { badge.hidden = false; badge.textContent = [...p.medicines, ...p.labs].filter(x => x.needsReview).length + " to review"; }
  box.innerHTML = `
    <div class="rec-head">🔍 <b>Review before saving: ${escapeHtml(p.fileName)}</b>
      <span class="dtype">${escapeHtml(p.docType)}</span>
      <span class="date">${escapeHtml(p.dates[0] || p.createdAt.slice(0, 10))}</span></div>
    <p class="muted small">Every value links to its source snippet. <b class="warn-text">Yellow = low confidence — confirm or correct.</b> Nothing saves until you approve.</p>
    ${conflicts.length ? `<div class="conflict">⚠️ <b>Dose/schedule changed vs earlier record:</b><ul>${conflicts.map(c => `<li><b>${escapeHtml(c.name)}</b>: ${escapeHtml(c.from)} → <b>${escapeHtml(c.to)}</b> — carry both to your doctor, do not adjust yourself.</li>`).join("")}</ul></div>` : ""}
    <h4>Medicines (${p.medicines.length})</h4>
    ${p.medicines.length ? p.medicines.map((m, i) => `
      <div class="rev-item ${m.needsReview ? "needs" : "ok"}">
        <div><b>${escapeHtml(m.name)}</b> ${m.confidence === "high" ? `<span class="badge ok">High</span>` : m.confidence === "medium" ? `<span class="badge warn">Medium — verify</span>` : `<span class="badge bad">Low — confirm</span>`}</div>
        <div class="row">
          <label>Dose <input data-pmed="${i}" data-f="dosage" value="${escapeHtml(m.dosage)}"></label>
          <label>Schedule <input data-pmed="${i}" data-f="frequency" value="${escapeHtml(m.frequency)}"></label>
        </div>
        <div class="muted small">Source: “${escapeHtml(m.span || m.evidence || "")}” ${m.null_reason ? `· ${escapeHtml(m.null_reason)}` : ""}</div>
      </div>`).join("") : `<p class="muted">No medicines detected.</p>`}
    <h4>Lab values (${p.labs.length})</h4>
    ${p.labs.length ? `<ul class="vals">${p.labs.map(l => `<li>${flagBadge(l.flag)} <b>${escapeHtml(l.test)}</b> — ${escapeHtml(String(l.value))} ${escapeHtml(l.unit)} ${l.needsReview ? `<span class="badge warn">check unit</span>` : `<span class="badge ok">High</span>`}<br><span class="muted small">Source: “${escapeHtml(l.span || "")}”</span></li>`).join("")}</ul>` : `<p class="muted">No lab values.</p>`}
    <div class="row">
      <button class="btn primary" id="confirmPending">✅ Confirm & save to timeline</button>
      <button class="btn" id="discardPending">Discard</button>
    </div>
    <div class="disclaimer">⚠️ Educational organizing tool only — not medical advice. Illegible doses must be verified by your doctor/pharmacist.</div>`;
  document.querySelector("#confirmPending").onclick = () => {
    document.querySelectorAll("[data-pmed]").forEach(inp => {
      const m = p.medicines[+inp.dataset.pmed];
      m[inp.dataset.f] = inp.value.trim() || m[inp.dataset.f];
      m.needsReview = false; m.confidence = "high"; m.userConfirmed = true;
    });
    state.records.push(p); state.pending = null; state.geminiNote = "";
    persist(); renderAll(); switchTab("summary");
    $("#status").textContent = `Saved: ${p.medicines.length} medicines, ${p.labs.length} labs with provenance.`;
  };
  document.querySelector("#discardPending").onclick = () => { state.pending = null; renderReview(); $("#status").textContent = "Discarded pending record — nothing saved."; };
}

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
  const needs = [...rec.medicines, ...rec.labs].filter(x => x.needsReview);
  const conflicts = findConflicts(rec);
  if (needs.length || conflicts.length) {
    state.pending = rec;
    persist(); renderAll(); switchTab("review");
    $("#status").textContent = `Needs review: ${needs.length} uncertain + ${conflicts.length} changed — confirm before saving.`;
    return;
  }
  state.records.push(rec); state.geminiNote = "";
  persist(); renderAll();
  switchTab("summary");
  $("#status").textContent = `Extracted: ${rec.medicines.length} medicines, ${rec.labs.length} lab values, ${rec.diagnoses.length} diagnoses.`;
}

function switchTab(name) {
  state.activeTab = name;
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  ["summary", "review", "data", "timeline", "fhir"].forEach(k => { const el = $("#tab-" + k); if (el) el.hidden = (k !== name); });
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
    state.records = []; state.wellness = []; state.geminiNote = ""; state.pending = null; persist(); renderAll();
  };
  const selfBtn = $("#selfBtn");
  if (selfBtn) selfBtn.onclick = () => {
    try {
      const res = runSelfCheck();
      const passed = res.filter(r => r.pass).length;
      $("#status").textContent = `Self-check: ${passed}/${res.length} passed — ${res.map(r => r.id + ":" + (r.pass ? "✅" : "❌")).join(" ")}`;
      switchTab("review");
    } catch (e) { $("#status").textContent = "Self-check failed: " + e.message; }
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
