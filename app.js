// =====================================================================
// Anesthesia Qualification Generator — app logic
// =====================================================================

const ACTION_LABEL = {
  ADD_CONSULTATION: { title: "Required consultations", tagClass: "consult" },
  ADD_NOTE: { title: "Additional notes", tagClass: "note" },
  ADD_WARNING: { title: "Warnings", tagClass: "warning" },
};

let RULES = [];

// ---- Rules.txt parser -------------------------------------------------
// Syntax: IF <field> <op> "<value>" [AND <field> <op> "<value>"]* THEN <ACTION> "<text>"
function parseRules(raw) {
  const lines = raw.split("\n");
  const rules = [];
  const errors = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const m = line.match(/^IF\s+(.+?)\s+THEN\s+(ADD_CONSULTATION|ADD_NOTE|ADD_WARNING)\s+"(.*)"\s*$/i);
    if (!m) {
      errors.push(`Line ${idx + 1}: could not parse — "${line}"`);
      return;
    }
    const [, condPart, action, text] = m;
    const condTokens = condPart.split(/\s+AND\s+/i);
    const conditions = [];
    for (const tok of condTokens) {
      const cm = tok.trim().match(/^(\w+)\s+(CONTAINS|EQUALS|>=|<=|>|<)\s+"(.*)"$/i);
      if (!cm) {
        errors.push(`Line ${idx + 1}: bad condition — "${tok}"`);
        return;
      }
      conditions.push({ field: cm[1].toLowerCase(), op: cm[2].toUpperCase(), value: cm[3] });
    }
    rules.push({ conditions, action: action.toUpperCase(), text, line: idx + 1 });
  });

  return { rules, errors };
}

function evaluateCondition(cond, data) {
  const { field, op, value } = cond;
  let fieldValue;

  if (field === "sex") fieldValue = data.sex || "";
  else if (field === "age") fieldValue = data.age;
  else if (field === "illness") fieldValue = data.illnesses.join(", ");
  else if (field === "medication") fieldValue = data.medications.join(", ");
  else return false;

  if (field === "age") {
    const num = parseFloat(value);
    const age = parseFloat(fieldValue);
    if (Number.isNaN(age)) return false;
    switch (op) {
      case ">": return age > num;
      case ">=": return age >= num;
      case "<": return age < num;
      case "<=": return age <= num;
      case "EQUALS": return age === num;
      case "CONTAINS": return String(age).includes(value);
      default: return false;
    }
  }

  const hay = String(fieldValue).toLowerCase();
  const needle = String(value).toLowerCase();
  if (op === "CONTAINS") return hay.includes(needle);
  if (op === "EQUALS") return hay === needle;
  return false;
}

function runRules(rules, data) {
  const results = { ADD_CONSULTATION: [], ADD_NOTE: [], ADD_WARNING: [] };
  for (const rule of rules) {
    const matches = rule.conditions.every((c) => evaluateCondition(c, data));
    if (matches) results[rule.action].push(rule.text);
  }
  return results;
}

// ---- Form helpers -------------------------------------------------------
function collectFormData() {
  const age = parseFloat(document.getElementById("age").value);
  const sex = document.getElementById("sex").value;
  const illnesses = Array.from(document.querySelectorAll('input[name="illness"]:checked')).map((el) => el.value);
  const medications = Array.from(document.querySelectorAll('input[name="medication"]:checked')).map((el) => el.value);
  const otherIllness = document.getElementById("otherIllness").value.trim();
  const otherMedication = document.getElementById("otherMedication").value.trim();
  if (otherIllness) illnesses.push(otherIllness);
  if (otherMedication) medications.push(otherMedication);

  return { age, sex, illnesses, medications };
}

function buildReportText(data, results) {
  const lines = [];
  const dateStr = new Date().toLocaleDateString();

  lines.push(`PREOPERATIVE ANESTHESIA QUALIFICATION NOTE`);
  lines.push(`Date: ${dateStr}`);
  lines.push("");
  lines.push(`Patient: ${Number.isFinite(data.age) ? data.age + " y/o" : "[age not entered]"} ${data.sex || "[sex not selected]"}`);
  lines.push(`Comorbidities: ${data.illnesses.length ? data.illnesses.join(", ") : "none reported"}`);
  lines.push(`Current medication: ${data.medications.length ? data.medications.join(", ") : "none reported"}`);
  lines.push("");

  if (results.ADD_CONSULTATION.length) {
    lines.push("REQUIRED CONSULTATIONS:");
    results.ADD_CONSULTATION.forEach((t) => lines.push(`  - ${t}`));
    lines.push("");
  }
  if (results.ADD_WARNING.length) {
    lines.push("WARNINGS:");
    results.ADD_WARNING.forEach((t) => lines.push(`  - ${t}`));
    lines.push("");
  }
  if (results.ADD_NOTE.length) {
    lines.push("ADDITIONAL NOTES:");
    results.ADD_NOTE.forEach((t) => lines.push(`  - ${t}`));
    lines.push("");
  }
  if (!results.ADD_CONSULTATION.length && !results.ADD_WARNING.length && !results.ADD_NOTE.length) {
    lines.push("No additional consultations, warnings, or notes triggered by current selections.");
  }

  return lines.join("\n");
}

function renderTags(results) {
  const tagRow = document.getElementById("tagRow");
  tagRow.innerHTML = "";
  const counts = [
    ["consult", results.ADD_CONSULTATION.length, "consultation(s)"],
    ["warning", results.ADD_WARNING.length, "warning(s)"],
    ["note", results.ADD_NOTE.length, "note(s)"],
  ];
  counts.forEach(([cls, n, label]) => {
    if (n === 0) return;
    const span = document.createElement("span");
    span.className = `tag ${cls}`;
    span.textContent = `${n} ${label}`;
    tagRow.appendChild(span);
  });
}

function generate() {
  const data = collectFormData();
  const results = runRules(RULES, data);
  const text = buildReportText(data, results);
  const body = document.getElementById("reportBody");
  body.textContent = text;
  renderTags(results);
}

function copyOutput() {
  const text = document.getElementById("reportBody").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copyBtn");
    const original = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = original), 1400);
  });
}

function downloadOutput() {
  const text = document.getElementById("reportBody").textContent;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "anesthesia-qualification-note.txt";
  a.click();
  URL.revokeObjectURL(url);
}

async function loadRules() {
  try {
    const res = await fetch("rules.txt", { cache: "no-store" });
    const raw = await res.text();
    const { rules, errors } = parseRules(raw);
    RULES = rules;
    if (errors.length) {
      console.warn("Rules.txt parse warnings:", errors);
    }
  } catch (e) {
    console.error("Could not load rules.txt", e);
    RULES = [];
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadRules();
  document.getElementById("generateBtn").addEventListener("click", generate);
  document.getElementById("copyBtn").addEventListener("click", copyOutput);
  document.getElementById("downloadBtn").addEventListener("click", downloadOutput);
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("patientForm").reset();
    document.getElementById("reportBody").innerHTML = '<span class="empty">Fill in patient data and click "Generate note" to produce text here.</span>';
    document.getElementById("tagRow").innerHTML = "";
  });
});
