/* Plain-language summarizer (offline, 4 languages) + optional Gemini enhancement.
   Safety-first wording: educational only, hedging, always advises consulting a doctor. */

const DISCLAIMER = {
  en: "Educational summary only — not a diagnosis. Medicines and abnormal values must be reviewed by your doctor. In an emergency, seek care immediately.",
  hi: "केवल जानकारी हेतु सारांश — निदान नहीं। दवाएं और असामान्य मान डॉक्टर से जरूर पूछें। आपात स्थिति में तुरंत इलाज लें।",
  te: "అవగాహన కోసం మాత్రమే — నిర్ధారణ కాదు. మందులు, అసాధారణ విలువల గురించి డాక్టర్‌ను సంప్రదించండి.",
  ta: "புரிதலுக்காக மட்டும் — நோயறிதல் அல்ல. மருந்துகள் குறித்து மருத்துவரை அணுகவும்.",
};

const SECTION_TITLE = {
  summary: { en: "What this record says", hi: "इस रिकॉर्ड में क्या है", te: "ఈ రికార్డులో ఏముంది", ta: "இந்த அறிக்கையில் என்ன உள்ளது" },
  abnormal: { en: "Values needing attention", hi: "ध्यान देने वाले मान", te: "గమనించాల్సిన విలువలు", ta: "கவனிக்க வேண்டிய மதிப்புகள்" },
  meds: { en: "Medicines explained", hi: "दवाओं की सरल व्याख्या", te: "మందుల వివరణ", ta: "மருந்துகள் விளக்கம்" },
  ask: { en: "Questions to ask your doctor", hi: "डॉक्टर से पूछने वाले सवाल", te: "డాక్టర్‌ను అడగాల్సిన ప్రశ్నలు", ta: "மருத்துவரிடம் கேட்க வேண்டியவை" },
  next: { en: "Suggested next steps", hi: "अगले सुझाए कदम", te: "తదుపరి చర్యలు", ta: "அடுத்த கட்டங்கள்" },
};

const DOC_LABEL = {
  prescription: { en: "Prescription", hi: "नुस्खा (पर्चा)", te: "ప్రిస్క్రిప్షన్", ta: "மருந்துச் சீட்டு" },
  lab_report: { en: "Lab report", hi: "लैब रिपोर्ट", te: "ల్యాబ్ రిపోర్ట్", ta: "ஆய்வக அறிக்கை" },
  discharge_summary: { en: "Discharge summary", hi: "डिस्चार्ज सारांश", te: "డిశ్చార్జ్ సారాంశం", ta: "டிஸ்சார்ஜ் சுருக்கம்" },
  diagnostic_report: { en: "Diagnostic / scan report", hi: "जांच/स्कैन रिपोर्ट", te: "డయాగ్నస్టిక్ రిపోర్ట్", ta: "நோயறிதல் அறிக்கை" },
  general_record: { en: "Health record", hi: "स्वास्थ्य रिकॉर्ड", te: "ఆరోగ్య రికార్డు", ta: "சுகாதார பதிவு" },
};

function buildLocalSummary(rec, lang) {
  lang = ["en", "hi", "te", "ta"].includes(lang) ? lang : "en";
  const L = [];
  const docName = (DOC_LABEL[rec.docType] || DOC_LABEL.general_record)[lang];
  const abn = rec.labs.filter(l => l.flag === "high" || l.flag === "low");
  const bord = rec.labs.filter(l => l.flag === "borderline");

  // Headline
  if (lang === "en") {
    let h = `This looks like a ${docName.toLowerCase()}`;
    if (rec.facility) h += ` from ${rec.facility}`;
    if (rec.doctor) h += ` by Dr. ${rec.doctor}`;
    h += ". ";
    if (rec.diagnoses.length) h += `It mentions: ${rec.diagnoses.map(d => d.display).join(", ")}. `;
    if (!abn.length && !bord.length && rec.labs.length) h += "All measured values in this report are within the usual range. ";
    else if (abn.length) h += `${abn.length} value${abn.length > 1 ? "s look" : " looks"} outside the usual range and should be reviewed with your doctor. `;
    else if (bord.length) h += "Values are mostly okay but some are borderline — worth tracking and discussing at your next visit. ";
    if (rec.medicines.length) h += `It lists ${rec.medicines.length} medicine${rec.medicines.length > 1 ? "s" : ""} — take exactly as prescribed and don't stop or change doses on your own.`;
    L.push(h);
  } else if (lang === "hi") {
    let h = `यह ${docName} जैसा दिखता है। `;
    if (rec.diagnoses.length) h += `इसमें उल्लेख है: ${rec.diagnoses.map(d => d.display).join(", ")}। `;
    if (abn.length) h += `${abn.length} मान सामान्य सीमा से बाहर हैं — डॉक्टर से जरूर दिखाएं। `;
    else if (rec.labs.length) h += "रिपोर्ट के मान सामान्य सीमा में हैं। ";
    if (rec.medicines.length) h += `${rec.medicines.length} दवाएं लिखी हैं — बिल्कुल निर्देशानुसार लें, खुद बंद/बदल न करें।`;
    L.push(h);
  } else if (lang === "te") {
    let h = `ఇది ${docName} లాగా ఉంది. `;
    if (rec.diagnoses.length) h += `పేర్కొన్నవి: ${rec.diagnoses.map(d => d.display).join(", ")}. `;
    if (abn.length) h += `${abn.length} విలువలు సాధారణ పరిధికి వెలుపల ఉన్నాయి — డాక్టర్‌తో చర్చించండి. `;
    else if (rec.labs.length) h += "విలువలు సాధారణ పరిధిలో ఉన్నాయి. ";
    if (rec.medicines.length) h += `${rec.medicines.length} మందులు ఉన్నాయి — సూచించినట్లే వాడండి.`;
    L.push(h);
  } else {
    let h = `இது ${docName} போல் தெரிகிறது. `;
    if (rec.diagnoses.length) h += `குறிப்பிடப்பட்டவை: ${rec.diagnoses.map(d => d.display).join(", ")}. `;
    if (abn.length) h += `${abn.length} மதிப்புகள் வழக்கமான வரம்பிற்கு வெளியே உள்ளன — மருத்துவரிடம் காட்டவும். `;
    else if (rec.labs.length) h += "மதிப்புகள் வழக்கமான வரம்பில் உள்ளன. ";
    if (rec.medicines.length) h += `${rec.medicines.length} மருந்துகள் உள்ளன — அறிவுறுத்தியபடியே எடுக்கவும்.`;
    L.push(h);
  }

  const sections = { headline: L.join(""), abnormal: [], meds: [], ask: [], next: [] };

  for (const l of rec.labs) {
    const sym = l.flag === "normal" ? "✅" : (l.flag === "borderline" ? "⚠️" : "🔴");
    const val = typeof l.value === "number" ? l.value : l.value;
    sections.abnormal.push(`${sym} ${l.test}: ${val} ${l.unit} (usual ${l.low}–${l.high}) — ${(l.meaning && l.meaning[lang]) || l.meaning.en}`);
  }
  for (const m of rec.medicines) {
    sections.meds.push(`• ${m.name} ${m.dosage !== "as written" ? m.dosage : ""} — ${m.frequency}${m.duration ? ", " + m.duration : ""}. Take as prescribed; ask your doctor/pharmacist what it is for and about food, alcohol, and side-effects.`);
  }
  if (rec.diagnoses.length) {
    sections.ask.push(...rec.diagnoses.map(d => `What is the current status of my ${d.display.toLowerCase()} and what target should I aim for?`));
  }
  if (abn.length) sections.ask.push("Which abnormal value is most urgent, and should any test be repeated or any medicine changed?");
  if (rec.medicines.length) sections.ask.push("Are there side-effects or interactions I should watch for with these medicines?");
  sections.ask.push("What diet, activity, or follow-up visit do you advise before the next review?");
  sections.next.push("Keep taking prescribed medicines on time; carry this report to your next visit.");
  if (abn.length) sections.next.push("Book a follow-up to review the flagged values — bring all current medicines and recent reports.");
  else sections.next.push("Continue routine follow-up as advised; repeat tests only when your doctor orders them.");
  sections.next.push("Log daily wellness (BP, sugar, weight, symptoms) in the Timeline tab to spot trends.");

  return { lang, ...sections, disclaimer: DISCLAIMER[lang] };
}

async function enhanceWithGemini(rec, local, apiKey) {
  if (!apiKey) return null;
  try {
    const prompt = `You are a careful health explainer for Indian patients. Explain this medical record in SIMPLE plain language (grade-6 reading level). Do NOT diagnose or change medicines. Include: 1) one-paragraph summary 2) each abnormal lab value and what it may mean 3) medicine adherence reminder 4) 4 questions to ask doctor. Add: "Educational only, see your doctor." Record JSON: ${JSON.stringify({ docType: rec.docType, diagnoses: rec.diagnoses.map(d => d.display), labs: rec.labs.map(l => ({ test: l.test, value: l.value, unit: l.unit, flag: l.flag })), medicines: rec.medicines.map(m => m.name + " " + m.dosage + " " + m.frequency) }).slice(0, 4000)}`;
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 900 } }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const t = j?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    return t.trim() || null;
  } catch { return null; }
}
