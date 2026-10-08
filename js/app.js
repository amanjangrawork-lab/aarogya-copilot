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
  tlFilter: "all", tlQuery: "",
  share: JSON.parse(localStorage.getItem("ac_share") || "null"),
  remind: localStorage.getItem("ac_remind") === "1",
};
try { state.profile = JSON.parse(localStorage.getItem("ac_profile") || "{}"); } catch { state.profile = {}; }

function persist() {
  localStorage.setItem("ac_records", JSON.stringify(state.records));
  localStorage.setItem("ac_wellness", JSON.stringify(state.wellness));
  localStorage.setItem("ac_lang", state.lang);
  localStorage.setItem("ac_ocrLang", state.ocrLang || "eng");
  localStorage.setItem("ac_share", JSON.stringify(state.share));
  localStorage.setItem("ac_remind", state.remind ? "1" : "0");
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
    box.innerHTML = `<div class="empty">📤 <b>No records yet.</b><br>Upload a prescription/lab photo or PDF, paste report text, or load the example report above to see your health summary here.</div>`;
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
    ${rec.medicines.length ? `<ul class="meds">${rec.medicines.map(m => `<li>💊 <b translate="no">${escapeHtml(m.name)}</b> ${escapeHtml(m.dosage)} · ${escapeHtml(m.frequency)}${m.duration ? " · " + escapeHtml(m.duration) : ""} <span class="muted small">${m.userConfirmed ? "✅ confirmed" : "· " + m.confidence}</span></li>`).join("")}</ul><p class="muted">Take exactly as prescribed. Never start, stop, or change a dose without your doctor. Drug names never translated.</p>` : `<p class="muted">No medicines detected in this record.</p>`}
    <h4>${escapeHtml(SECTION_TITLE.ask[state.lang])}</h4>
    <ol class="ask">${s.ask.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ol>
    <h4>${escapeHtml(SECTION_TITLE.next[state.lang])}</h4>
    <ul class="next">${s.next.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
    <div class="disclaimer">⚠️ ${escapeHtml(s.disclaimer)}</div>
    <p class="muted small range-note">Reference ranges shown are adult-general; your lab's printed range prevails — confirm with your doctor.</p>
    <div class="print-only" aria-hidden="true">
      <h2>Doctor visit sheet — ${escapeHtml(state.profile.name || "Patient")}</h2>
      <p>${escapeHtml([state.profile.age ? state.profile.age + "y" : "", state.profile.gender || "", rec.dates[0] || rec.createdAt.slice(0, 10)].filter(Boolean).join(" · "))} · ${escapeHtml(rec.fileName)}</p>
      <h3>Active medicines</h3>
      <p>${rec.medicines.length ? rec.medicines.map(m => `${m.name} ${m.dosage} — ${m.frequency}`).map(escapeHtml).join("; ") : "None detected"}</p>
      <h3>Flagged values</h3>
      <p>${abn.length ? abn.map(l => `${l.test} ${l.value} ${l.unit} (${l.flag})`).map(escapeHtml).join("; ") : "All measured values in usual range"}</p>
      <h3>Ask the doctor</h3>
      <p>${s.ask.slice(0, 3).map(escapeHtml).join(" ")}</p>
      <p class="muted small">Educational only — not a diagnosis. Generated by Aarogya Copilot (offline).</p>
    </div>`;
  const spk = $("#speakBtn");
  if (spk) spk.onclick = () => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(s.headline + ". " + abn.map(l => `${l.test} ${l.value} ${l.unit}, ${l.flag}`).join(". "));
      u.lang = state.lang === "hi" ? "hi-IN" : state.lang === "te" ? "te-IN" : state.lang === "ta" ? "ta-IN" : "en-IN";
      speechSynthesis.speak(u);
    } catch { $("#status").textContent = "Audio not supported in this browser."; }
  };
  // Gemini optional (key lives only in Settings; no upsell inside the medical summary)
  const g = $("#geminiBox");
  if (state.geminiNote) g.innerHTML = `<div class="gemini"><h4>✨ Gemini AI explanation</h4><p>${escapeHtml(state.geminiNote)}</p></div>`;
  else if (state.gemini) g.innerHTML = `<button class="btn small" id="enhanceBtn">✨ Enhance with Gemini</button>`;
  else g.innerHTML = "";
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
  // Provenance ledger: every value → source doc, span, confidence, status
  const rows = [];
  state.records.forEach(rec => {
    rec.medicines.forEach(m => rows.push({ doc: rec.fileName, item: m.name + " " + m.dosage, span: m.span || m.evidence || "", conf: m.confidence || "—", status: m.userConfirmed ? "✅ confirmed" : (m.needsReview ? "⚠️ needs review" : "auto") }));
    rec.labs.forEach(l => rows.push({ doc: rec.fileName, item: l.test + " " + l.value + " " + l.unit, span: l.span || "", conf: l.confidence || "—", status: l.userConfirmed ? "✅ confirmed" : (l.needsReview ? "⚠️ needs review" : "auto") }));
  });
  if (rows.length) box.innerHTML += `<div class="card"><h4>📜 Provenance ledger (${rows.length})</h4><p class="muted small">Every extracted value, its source snippet, confidence, and review status. Nothing here is medical advice.</p><table><thead><tr><th>Value</th><th>Source doc</th><th>Evidence span</th><th>Conf.</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td translate="no">${escapeHtml(r.item)}</td><td>${escapeHtml(r.doc)}</td><td class="muted small">${escapeHtml(r.span.slice(0, 60))}</td><td>${escapeHtml(r.conf)}</td><td>${escapeHtml(r.status)}</td></tr>`).join("")}</tbody></table></div>`;
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
  const q = (state.tlQuery || "").toLowerCase().trim();
  const matchQ = s => !q || String(s || "").toLowerCase().includes(q);
  const showMeds = state.tlFilter === "all" || state.tlFilter === "meds";
  const showLabs = state.tlFilter === "all" || state.tlFilter === "labs";
  const showWell = state.tlFilter === "all" || state.tlFilter === "wellness";
  const showVis = state.tlFilter === "all" || state.tlFilter === "visits";
  const medsShown = showMeds ? meds.filter(m => matchQ(m.name + " " + m.dosage + " " + m.frequency)) : [];
  const trendsShown = showLabs ? trends.filter(g => matchQ(g.test)).slice(0, 4) : [];
  let events = [
    ...state.records.map(r => {
      const conf = findConflicts(r).length ? ` · ⚠️ dose changed vs earlier` : "";
      const kind = r.docType === "lab_report" ? "labs" : r.docType === "prescription" ? "meds" : "visits";
      return { kind, date: (r.dates[0] || r.createdAt.slice(0, 10)), icon: docIcon(r.docType), title: r.fileName, sub: `${r.diagnoses.map(d => d.display).join(", ") || r.docType} · ${r.medicines.length} meds · ${r.labs.filter(l => l.flag !== "normal").length} flags${conf}` };
    }),
    ...state.wellness.map(w => ({ kind: "wellness", date: w.date, icon: "❤️", title: `Wellness — BP ${w.bp || "–"}, Sugar ${w.sugar || "–"}, Wt ${w.wt || "–"}`, sub: w.note || "" })),
  ].sort((a, b) => {
    try { return parseRecordDate(a.date) - parseRecordDate(b.date); }
    catch { return String(a.date).localeCompare(String(b.date)); }
  });
  events = events.filter(e => (state.tlFilter === "all" || e.kind === state.tlFilter || (state.tlFilter === "visits" && e.kind === "visits")) && matchQ(e.title + " " + e.sub));
  if (!state.records.length && !state.wellness.length) { box.innerHTML = `<div class="empty">Your unified timeline will appear here — records + wellness logs in one place.</div>`; return; }
  if (!events.length && !medsShown.length && !trendsShown.length) { box.innerHTML = `<div class="empty">No matches for “${escapeHtml(state.tlQuery)}”. Try clearing the search or choosing All.</div>`; return; }
  box.innerHTML = `
    ${medsShown.length ? `<h4>💊 Currently active medicines (${medsShown.length}) — latest per name</h4>
    <ul class="meds">${medsShown.map(m => `<li><b translate="no">${escapeHtml(m.name)}</b> ${escapeHtml(m.dosage)} · ${escapeHtml(m.frequency)} <span class="muted small">since ${escapeHtml(m.date)} · ${escapeHtml(m.from)}</span></li>`).join("")}</ul>
    <p class="muted small">Take exactly as prescribed. Never start/stop/change without your doctor.</p>` : ""}
    ${trendsShown.length ? `<h4>📈 Lab trends (across records)</h4>${trendsShown.map(g => `<div class="rev-item"><b>${escapeHtml(g.test)}</b> <span class="muted small">usual ${escapeHtml(String(g.low))}–${escapeHtml(String(g.high))} ${escapeHtml(g.unit)}</span><br>${sparkline(g.points)}</div>`).join("")}` : ""}
    <h4>🕒 Unified timeline</h4>
    ${events.length ? `<div class="timeline">${events.map(e => `<div class="t-item"><div class="t-dot">${e.icon}</div><div><b>${escapeHtml(e.title)}</b><div class="muted small">${escapeHtml(e.date)} · ${escapeHtml(e.sub)}</div></div></div>`).join("")}</div>` : `<p class="muted small">No timeline events match this filter.</p>`}`;
}

function renderFhir() {
  const bundle = buildFhirBundle(state.profile, state.records);
  const v = validateFhirBundle(bundle);
  $("#fhirMeta").innerHTML = `
    <div class="fhir-grid">
      <div>${v.valid ? `<span class="badge ok">✅ FHIR R4 valid</span>` : `<span class="badge bad">⚠️ FHIR gaps</span>`} <b>Resources:</b> ${bundle.entry.length} (Patient ×1, Observations ×${bundle.entry.filter(e => e.resource.resourceType === "Observation").length}, MedicationRequests ×${bundle.entry.filter(e => e.resource.resourceType === "MedicationRequest").length}, Conditions ×${bundle.entry.filter(e => e.resource.resourceType === "Condition").length})</div>
      ${v.valid ? "" : `<div class="muted small">Gaps: ${v.gaps.map(escapeHtml).join("; ")}</div>`}
      <div><b>Standards:</b> FHIR R4 · LOINC · ICD-10 · SNOMED CT · ABDM NRKES profiles</div>
      <div><b>ABHA:</b> ${state.profile.abha ? escapeHtml(state.profile.abha) + " (mock linked)" : "not linked — use Link ABHA"}</div>
    </div>`;
  $("#fhirJson").textContent = JSON.stringify(bundle, null, 2);
  const sh = $("#shareBox");
  if (sh) {
    if (state.share && new Date(state.share.expiry) > new Date()) {
      sh.innerHTML = `<div class="rev-item ok"><b>🔗 Time-bound share active</b> — expires ${escapeHtml(state.share.expiry.slice(0, 10))} (${escapeHtml(state.share.scope)})<br><span class="muted small">${escapeHtml(state.share.link)}</span>
        <div class="row"><button class="btn small" id="copyShare">Copy link</button><button class="btn small danger" id="revokeShare">Revoke now</button></div></div>`;
      $("#copyShare").onclick = async () => {
        try { await navigator.clipboard.writeText(state.share.link); $("#status").textContent = "Share link copied."; }
        catch { $("#status").textContent = "Copy blocked — long-press the link to copy manually."; }
      };
      $("#revokeShare").onclick = () => { state.share = null; persist(); renderFhir(); $("#status").textContent = "Share revoked — link no longer valid (audit kept in timeline)."; };
    } else {
      if (state.share) state.share = null;
      sh.innerHTML = `<div class="row"><button class="btn small" id="mkShare">🔗 Create 7-day share link (mock consent)</button></div>
        <p class="muted small">Simulates ABDM consent: time-bound, revocable, purpose-limited to “care visit”. No data leaves your browser in this demo.</p>`;
      const mk = $("#mkShare");
      if (mk) mk.onclick = () => {
        const exp = new Date(Date.now() + 7 * 864e5).toISOString();
        state.share = { id: "shr_" + Math.random().toString(36).slice(2, 8), expiry: exp, scope: "care visit — records + summary", link: location.href.split("#")[0] + "#share-shr_demo-exp-" + exp.slice(0, 10) };
        persist(); renderFhir(); $("#status").textContent = "Share link created — valid 7 days, revocable anytime.";
      };
    }
  }
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
    ${conflicts.length ? `<div class="conflict">⚠️ <b>Dose/schedule changed vs earlier record:</b><ul>${conflicts.map((c, ci) => `<li><b translate="no">${escapeHtml(c.name)}</b>: ${escapeHtml(c.from)} → <b>${escapeHtml(c.to)}</b><br><span class="muted small">Carry both to your doctor — do not adjust yourself.</span><br><button class="btn small" data-keepnew="${ci}">Keep new</button> <button class="btn small" data-keepold="${ci}">Keep earlier (${escapeHtml(c.from)})</button></li>`).join("")}</ul></div>` : ""}
    <h4>Medicines (${p.medicines.length})</h4>
    ${p.medicines.length ? p.medicines.map((m, i) => `
      <div class="rev-item ${m.needsReview ? "needs" : "ok"}">
        <div><b translate="no">${escapeHtml(m.name)}</b> ${m.confidence === "high" ? `<span class="badge ok">High</span>` : m.confidence === "medium" ? `<span class="badge warn">Medium — verify</span>` : `<span class="badge bad">Low — confirm</span>`}</div>
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
  $$("#reviewBox [data-keepold]").forEach(b => b.onclick = () => {
    const c = findConflicts(p)[+b.dataset.keepold];
    const m = p.medicines.find(x => x.name === c.name);
    if (m) {
      const parts = c.from.split("·").map(s => s.trim());
      const oldDose = parts[0], oldFreq = (parts[1] || "").split("(")[0].trim();
      if (oldDose) m.dosage = oldDose;
      if (oldFreq) m.frequency = oldFreq;
      m.userConfirmed = true; m.needsReview = false; m.confidence = "high";
      m.evidence = (m.evidence || "") + " [kept earlier per your choice]";
    }
    renderReview();
    $("#status").textContent = `Kept earlier dose for ${c.name} — confirm & save when ready.`;
  });
  $$("#reviewBox [data-keepnew]").forEach(b => b.onclick = () => {
    const c = findConflicts(p)[+b.dataset.keepnew];
    const m = p.medicines.find(x => x.name === c.name);
    if (m) { m.userConfirmed = true; m.needsReview = false; m.confidence = "high"; }
    renderReview();
    $("#status").textContent = `Kept new dose for ${c.name} — confirm & save when ready.`;
  });
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
    } catch (e) {
      const hint = /10 MB/.test(e.message) ? " "
        : /OCR library not loaded/.test(e.message) ? " Check internet once (OCR loads from CDN), or paste the text below — paste always works offline. "
        : /No readable text|No text found/.test(e.message) ? " Try a clearer, well-lit photo with the page flat, or paste the text below. "
        : " ";
      status.textContent = "⚠️ " + f.name + ": " + e.message + hint;
    }
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
  $$(".tab").forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });
  ["summary", "review", "data", "timeline", "fhir"].forEach(k => { const el = $("#tab-" + k); if (el) el.hidden = (k !== name); });
}

function wire() {
  $("#langSel").onchange = e => { state.lang = e.target.value; persist(); applyLang(); };
  const tabs = $$(".tab");
  tabs.forEach((b, i) => {
    b.setAttribute("role", "tab");
    b.onclick = () => switchTab(b.dataset.tab);
    b.onkeydown = e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const n = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
      tabs[n].focus(); switchTab(tabs[n].dataset.tab);
    };
  });

  const dz = $("#drop");
  dz.onclick = () => $("#fileInput").click();
  dz.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#fileInput").click(); } };
  const tls = $("#tlSearch");
  if (tls) tls.oninput = e => { state.tlQuery = e.target.value; renderTimeline(); };
  $$("#tlChips button").forEach(b => b.onclick = () => {
    state.tlFilter = b.dataset.tlf;
    $$("#tlChips button").forEach(x => x.classList.toggle("on", x === b));
    renderTimeline();
  });
  $("#fileInput").onchange = e => handleFiles([...e.target.files]);
  ["dragover", "dragenter"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => handleFiles([...e.dataTransfer.files]));

  $("#analyzeBtn").onclick = () => {
    const tx = $("#pasteBox").value.trim();
    if (!tx) { $("#status").textContent = "Paste some report text first, or upload a file."; return; }
    addRecord(tx, "pasted-text"); $("#pasteBox").value = "";
  };
  const exLoad = $("#exampleLoad");
  if (exLoad) exLoad.onclick = () => {
    const sel = $("#exampleSel");
    const s = SAMPLES.find(x => x.id === (sel ? sel.value : "lab")) || SAMPLES[0];
    addRecord(s.text, s.label + ".txt");
  };
  const eraseBtn = $("#eraseBtn");
  if (eraseBtn) eraseBtn.onclick = () => {
    if (!confirm("Erase everything on this device — records, wellness logs, profile link? This cannot be undone.")) return;
    state.records = []; state.wellness = []; state.geminiNote = ""; state.pending = null; state.share = null; persist(); renderAll();
    $("#setModal").close();
  };
  const selfBtn = $("#selfBtn");
  if (selfBtn) selfBtn.onclick = () => {
    const out = $("#selfResult");
    try {
      const res = runSelfCheck();
      const passed = res.filter(r => r.pass).length;
      const msg = `Diagnostics: ${passed}/${res.length} passed — ${res.map(r => r.id + ":" + (r.pass ? "✅" : "❌")).join(" ")}`;
      if (out) out.textContent = msg;
      $("#status").textContent = msg;
    } catch (e) {
      if (out) out.textContent = "Diagnostics failed: " + e.message;
      $("#status").textContent = "Self-check failed: " + e.message;
    }
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
  const rmd = $("#remindBtn");
  const paintRemind = () => { if (rmd) rmd.textContent = state.remind ? "🔔 Daily log reminder: on" : "🔔 Daily log reminder: off"; };
  paintRemind();
  if (rmd) rmd.onclick = async () => {
    if (!state.remind) {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission().catch(() => "denied");
        if (perm !== "granted") { $("#status").textContent = "Reminder needs notification permission — blocked in browser settings."; return; }
      }
      state.remind = true; persist(); paintRemind();
      $("#status").textContent = "Reminder on: this device will nudge you if today's wellness log is missing.";
    } else { state.remind = false; persist(); paintRemind(); $("#status").textContent = "Reminder off."; }
  };
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
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  $("#fName").value = state.profile.name || ""; $("#fAge").value = state.profile.age || "";
  $("#fGender").value = state.profile.gender || "other"; $("#fPhone").value = state.profile.phone || "";
  $("#fDob").value = state.profile.dob || "";
  // seed profile name from samples for nicer demo if empty
  wire(); applyLang(); switchTab("summary");
  if (typeof pdfjsLib !== "undefined" && pdfjsLib.GlobalWorkerOptions)
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  if (typeof pdfjsLib === "undefined" && typeof Tesseract === "undefined") {
    $("#status").textContent = "Offline mode: photo/PDF OCR needs internet once — 1-click demos + paste-text work fully offline.";
  }
  if (state.remind && ("Notification" in window) && Notification.permission === "granted") {
    const today = new Date().toISOString().slice(0, 10);
    if (!state.wellness.some(w => w.date === today)) $("#status").textContent = "🔔 Daily nudge: no wellness log today — tap “Log BP / sugar / weight”.";
  }
});
