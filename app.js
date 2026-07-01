// =====================================================================
// Anesthesia Qualification Generator — app logic
// =====================================================================

const ACTION_LABEL = {
  ADD_CONSULTATION: { title: "Required consultations", tagClass: "consult" },
  ADD_NOTE: { title: "Additional notes", tagClass: "note" },
  ADD_WARNING: { title: "Warnings", tagClass: "warning" },
};

let RULES = [];
let PROCEDURES_BY_DEPARTMENT = {};

const DEFAULT_RULES_TEXT = `# Default rules placeholder — no rules loaded from file.
# To use project-specific rules, open via a web server instead of file://
`;

const DEFAULT_PROCEDURES_TEXT = `# Procedures list for dynamic department/procedure selection
# Use Dział: <name> to define a new department.
# Each subsequent non-empty, non-comment line is a procedure for that department.
# You can add more departments later by repeating Dział: <name>.

Dział: Chirurgia ogólna
Cholecystektomia
Węzłowanie przepukliny pachwinowej
Hemiekstrakcja jelita grubego
Laparoskopia diagnostyczna
Resekcja guza tarczycy

Dział: Ortopedia
Endoprotezoplastyka stawu biodrowego
Artroskopia kolana
Rekonstrukcja więzadła krzyżowego przedniego
Osteotomia piszczeli
Operacja zęba trzonowego

Dział: Ginekologia
Histerektomia
Laparo- i histeroskopowe wycięcie mięśniaka
Cesarskie cięcie
Operacja laparoskopowa guza jajnika

Dział: Urologia
Prostatektomia radykalna
Endoskopowa resekcja gruczołu krokowego (TURP)
Nefrektomia częściowa
Litotrypsja

Dział: Otolaryngologia
Tympanoplastyka
Septoplastyka
Usunięcie migdałków podniebiennych
Endoskopowa operacja zatok`;

const REPORT_TEMPLATE = `Konsultacja Anestezjologiczna
[Patient_Gendered] [Age] l. , waga [Mass] kg, wzrost [Height] cm, 
Dział [Department]
Zabieg [Operation]
Ukł. Nerwowy: [Neurological_Orientation] auto- i allo-psychocznie. Deficyty neurologiczne [Neurological_Signs]?
Ukł. Oddechowy: wydolny, [Respiratory_Rate] RR/min, saturacja [Saturation]%. Osłuchowo [Lung_Auscultation]
Ukł. Krążenia: wydolny, Tony serca w normie . BP [Blood_Preasure] , [Heart_Rate] /min. [Arytmia]. Obrzęki obwodowe - [Oedema]
Współistniejące choroby:

[Disease]

Przyjmowane leki : [Medications]

Uczulenia - [Alergie]
Palenia/Waporyzacja [Smoking]
Alkohol/Substancje psychoaktywne [Drugs]

Wynik konsultacji:
[Qualification_Result]

Skala ASA - [ASA_Scale], Skala Mallapathi - [Mallampathi_Scale], ruchomość szyi [Neck_Mobility],  zęby - [Teeth_condition]
Zalecenia:
[Recomendation_General]

Leki:
[Recomendation_Medication]`;

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function formatField(value) {
  return value == null ? "" : String(value);
}

function getGenderFields(sex) {
  if (sex === "female") {
    return {
      Patient_Gendered: "Pacjentka",
      Neurological_Orientation: "przytomna, zorientowana",
    };
  }

  if (sex === "male") {
    return {
      Patient_Gendered: "Pacjent",
      Neurological_Orientation: "przytomny, zorientowany",
    };
  }

  return {
    Patient_Gendered: "Pacjent/ka",
    Neurological_Orientation: "przytomna/y, zorientowana/y",
  };
}

function fillTemplate(template, data) {
  return template.replace(/\[([^\]]+)]/g, (_, key) => formatField(data[key]));
}

function setLoadStatus(message) {
  const status = document.getElementById("loadStatus");
  if (!status) return;
  status.textContent = message;
  status.style.display = message ? "inline-flex" : "none";
}

function parseProceduresTxt(raw) {
  const lines = raw.split("\n");
  const departments = {};
  let current = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const match = line.match(/^(Department|Dział):\s*(.+)$/i);
    if (match) {
      current = match[2].trim();
      departments[current] = departments[current] || [];
      return;
    }
    if (!current) return;
    departments[current].push(line);
  });

  return departments;
}

function populateDepartmentSelect(placeholderText = "Wybierz dział…") {
  const departmentSelect = document.getElementById("department");
  departmentSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderText;
  placeholder.disabled = true;
  placeholder.selected = true;
  departmentSelect.appendChild(placeholder);

  const departments = Object.keys(PROCEDURES_BY_DEPARTMENT);
  if (!departments.length) {
    departmentSelect.disabled = true;
    return;
  }

  departmentSelect.disabled = false;
  departments.forEach((dept) => {
    const option = document.createElement("option");
    option.value = dept;
    option.textContent = dept;
    departmentSelect.appendChild(option);
  });
}

function populateProcedureSelect(department) {
  const procedureSelect = document.getElementById("procedure");
  const procedureGroup = document.getElementById("otherProcedureGroup");
  procedureSelect.innerHTML = "";
  procedureGroup.style.display = "none";

  if (!department || !PROCEDURES_BY_DEPARTMENT[department]) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Wybierz dział najpierw";
    placeholder.disabled = true;
    placeholder.selected = true;
    procedureSelect.appendChild(placeholder);
    procedureSelect.disabled = true;
    return;
  }

  const options = PROCEDURES_BY_DEPARTMENT[department];
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Wybierz zabieg…";
  placeholder.disabled = true;
  placeholder.selected = true;
  procedureSelect.appendChild(placeholder);

  options.forEach((proc) => {
    const option = document.createElement("option");
    option.value = proc;
    option.textContent = proc;
    procedureSelect.appendChild(option);
  });

  const otherOption = document.createElement("option");
  otherOption.value = "__other__";
  otherOption.textContent = "Inny…";
  procedureSelect.appendChild(otherOption);
  procedureSelect.disabled = false;
}

function handleProcedureChange() {
  const procedureSelect = document.getElementById("procedure");
  const procedureGroup = document.getElementById("otherProcedureGroup");
  if (procedureSelect.value === "__other__") {
    procedureGroup.style.display = "block";
  } else {
    procedureGroup.style.display = "none";
  }
}

async function loadProcedures() {
  if (window.location.protocol === "file:") {
    PROCEDURES_BY_DEPARTMENT = parseProceduresTxt(DEFAULT_PROCEDURES_TEXT);
    populateDepartmentSelect("Korzystanie z domyślnych działów");
    setLoadStatus("Otworzono z file:// — używane domyślne działy.");
    return;
  }

  try {
    const res = await fetch("procedures.txt", { cache: "no-store" });
    const raw = await res.text();
    PROCEDURES_BY_DEPARTMENT = parseProceduresTxt(raw);
    if (Object.keys(PROCEDURES_BY_DEPARTMENT).length === 0) {
      console.warn("procedures.txt loaded but no departments were parsed. Falling back to default list.");
      PROCEDURES_BY_DEPARTMENT = parseProceduresTxt(DEFAULT_PROCEDURES_TEXT);
      setLoadStatus("Działy wczytano z domyślnej listy lokalnej.");
    }
    populateDepartmentSelect();
  } catch (e) {
    console.error("Could not load procedures.txt", e);
    PROCEDURES_BY_DEPARTMENT = parseProceduresTxt(DEFAULT_PROCEDURES_TEXT);
    populateDepartmentSelect("Korzystanie z domyślnych działów");
    setLoadStatus("Nie można wczytać procedures.txt — używane domyślne działy.");
  }
}

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
  const age = parseFloat(getValue("age"));
  const sex = getValue("sex");
  const illnesses = Array.from(document.querySelectorAll('input[name="illness"]:checked')).map((el) => el.value);
  const medications = Array.from(document.querySelectorAll('input[name="medication"]:checked')).map((el) => el.value);
  const otherIllness = getValue("otherIllness");
  const otherMedication = getValue("otherMedication");
  const diseaseText = getValue("disease");
  const department = getValue("department");
  const procedure = getValue("procedure");
  const otherProcedure = getValue("otherProcedure");

  if (otherIllness) illnesses.push(otherIllness);
  if (diseaseText) illnesses.push(diseaseText);
  if (otherMedication) medications.push(otherMedication);

  const genderFields = getGenderFields(sex);
  const fields = {
    ...genderFields,
    Age: getValue("age"),
    Mass: getValue("mass"),
    Height: getValue("height"),
    Department: department,
    Operation: otherProcedure || procedure,
    Neurological_Signs: getValue("neurologicalSigns"),
    Respiratory_Rate: getValue("respiratoryRate"),
    Saturation: getValue("saturation"),
    Lung_Auscultation: getValue("lungAuscultation"),
    Blood_Preasure: getValue("bloodPressure"),
    Heart_Rate: getValue("heartRate"),
    Arytmia: getValue("arytmia"),
    Oedema: getValue("oedema"),
    Disease: diseaseText || illnesses.join(", "),
    Medications: medications.join(", "),
    Alergie: getValue("allergies"),
    Smoking: getValue("smoking"),
    Drugs: getValue("drugs"),
    Qualification_Result: getValue("qualificationResult"),
    ASA_Scale: getValue("asaScale"),
    Mallampathi_Scale: getValue("mallampathiScale"),
    Neck_Mobility: getValue("neckMobility"),
    Teeth_condition: getValue("teethCondition"),
    Recomendation_General: getValue("recommendationGeneral"),
    Recomendation_Medication: getValue("recommendationMedication"),
  };

  return { age, sex, illnesses, medications, fields };
}

function buildReportText(data, results) {
  const generated = [];
  results.ADD_CONSULTATION.forEach((text) => generated.push(`Konsultacja: ${text}`));
  results.ADD_WARNING.forEach((text) => generated.push(`Ostrzeżenie: ${text}`));
  results.ADD_NOTE.forEach((text) => generated.push(`Uwaga: ${text}`));

  const generalRecs = data.fields.Recomendation_General.trim() ? [data.fields.Recomendation_General.trim()] : [];
  if (generated.length) {
    if (generalRecs.length) generalRecs.push("");
    generalRecs.push("=== Automatyczne zalecenia ===", ...generated);
  }

  const filledFields = { ...data.fields, Recomendation_General: generalRecs.join("\n") };
  return fillTemplate(REPORT_TEMPLATE, filledFields);
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
  if (window.location.protocol === "file:") {
    const { rules } = parseRules(DEFAULT_RULES_TEXT);
    RULES = rules;
    setLoadStatus("Otworzono z file:// — używane domyślne reguły.");
    return;
  }

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
    const { rules } = parseRules(DEFAULT_RULES_TEXT);
    RULES = rules;
    setLoadStatus("Nie można wczytać rules.txt — używane domyślne reguły.");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  populateDepartmentSelect("Wczytywanie działów…");
  populateProcedureSelect("");
  await Promise.all([loadRules(), loadProcedures()]);
  document.getElementById("department").addEventListener("change", (e) => populateProcedureSelect(e.target.value));
  document.getElementById("procedure").addEventListener("change", handleProcedureChange);
  document.getElementById("generateBtn").addEventListener("click", generate);
  document.getElementById("copyBtn").addEventListener("click", copyOutput);
  document.getElementById("downloadBtn").addEventListener("click", downloadOutput);
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("patientForm").reset();
    document.getElementById("reportBody").innerHTML = '<span class="empty">Wypełnij dane pacjenta i kliknij "Generuj notatkę", aby wygenerować tekst tutaj.</span>';
    document.getElementById("tagRow").innerHTML = "";
    document.getElementById("otherProcedureGroup").style.display = "none";
    populateDepartmentSelect();
    populateProcedureSelect("");
  });
});
