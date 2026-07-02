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
let MEDICATIONS_DB = [];

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

const DEFAULT_MEDICATIONS_TEXT = `# Medication database
# Format: Name | Active substances | Type
Metformina | metformina | Antidiabetics
Atorwastatyna | atorwastatyna | Statyny
Enalapril | enalapril | ACEI
Aspiryna | kwas acetylosalicylowy | NLPZ
Warfarina | warfaryna | Antykoagulanty
Omeprazol | omeprazol | Inhibitory pompy protonowej
Hydrochlorotiazyd | hydrochlorotiazyd | Diuretyki
Tamsulozyna | tamsulozyna | Alfa-blokery
Bumetanid | bumetanid | Diuretyki
Candesartan | candesartan | ARB`;

const REPORT_TEMPLATE = `Konsultacja Anestezjologiczna
[Patient_Gendered] [Age] l. , waga [Mass] kg, wzrost [Height] cm, 
Dział [Department]. Zabieg [Operation]
Ukł. Nerwowy: [Neurological_Orientation] auto- i allo-psychocznie. Deficyty neurologiczne [Neurological_Signs]
Ukł. Oddechowy: wydolny, [Respiratory_Rate] RR/min, saturacja [Saturation]%. Osłuchowo [Lung_Auscultation]
Ukł. Krążenia: wydolny, tony serca w normie . BP [Blood_Preasure] , [Heart_Rate] /min. Arytmia - [Arytmia]. Obrzęki obwodowe - [Oedema]
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

const AUSCULTATION_LOCATION_TEXT = {
  bilateral: "obustronnie",
  right_all: "nad całym polem płuca prawego",
  right_upper: "nad polem górnym płuca prawego",
  right_mid: "nad polem środkowym płuca prawego",
  right_lower: "nad polem dolnym (podstawnym) płuca prawego",
  left_all: "nad całym polem płuca lewego",
  left_upper: "nad polem górnym płuca lewego",
  left_lower: "nad polem dolnym (podstawnym) płuca lewego",
  bases: "obustronnie u podstaw płuc",
};

const AUSCULTATION_DETAIL_OPTIONS = {
  weakened: [
    ["mild", "nieznaczne osłabienie"],
    ["marked", "znaczne osłabienie"],
    ["suspected_fluid", "sugerujące płyn w jamie opłucnej"],
    ["suspected_atelectasis", "sugerujące niedodmę"],
  ],
  crackles: [
    ["fine_moist", "drobnobańkowe, wilgotne"],
    ["coarse_moist", "grubobańkowe, wilgotne"],
    ["fine_dry", "drobnobańkowe, suche"],
  ],
  crepitations: [
    ["velcro", "typu velcro — sugestywne dla śródmiąższowej choroby płuc"],
    ["mild", "nieliczne"],
    ["extensive", "liczne, rozsiane"],
  ],
  wheezes: [
    ["expiratory", "wydechowe, wydech wydłużony"],
    ["inspiratory_expiratory", "wdechowo-wydechowe"],
    ["diffuse", "rozsiane, liczne"],
    ["single", "pojedyncze"],
  ],
  bronchial: [
    ["focal_infiltrate", "ogniskowo zaostrzony — podejrzenie nacieku zapalnego"],
    ["diffuse", "rozlany"],
  ],
  friction: [
    ["standard", "wysłuchiwane wyraźnie"],
    ["subtle", "wysłuchiwane dyskretnie"],
  ],
  absent: [
    ["pneumothorax", "podejrzenie odmy opłucnowej"],
    ["large_effusion", "podejrzenie dużej ilości płynu w jamie opłucnej"],
  ],
};

const AUSCULTATION_FINDING_BASE = {
  weakened: "szmer pęcherzykowy osłabiony",
  crackles: "rzężenia",
  crepitations: "trzeszczenia",
  wheezes: "świsty i furczenia",
  bronchial: "szmer oskrzelowy",
  friction: "tarcie opłucnowe",
  absent: "brak szmeru pęcherzykowego",
};

function populateAuscultationDetails() {
  const detailSelect = document.getElementById("auscultationDetail");
  const findingSelect = document.getElementById("auscultationFinding");
  if (!detailSelect || !findingSelect) return;

  const key = findingSelect.value;
  const options = AUSCULTATION_DETAIL_OPTIONS[key] || [];
  detailSelect.innerHTML = options
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

function toggleAuscultationDetails() {
  const details = document.getElementById("auscultationAbnormalBlock");
  const result = document.getElementById("auscultationGeneral");
  if (!details || !result) return;
  details.style.display = result.value === "nieprawidłowy" ? "block" : "none";
}

function getAuscultationText() {
  const result = getValue("auscultationGeneral");
  if (result !== "nieprawidłowy") {
    return "szmer pęcherzykowy prawidłowy, symetryczny nad polami płucnymi";
  }

  const findingKey = getValue("auscultationFinding");
  const locationKey = getValue("auscultationLocation");
  const detailValue = getValue("auscultationDetail");
  const locationText = AUSCULTATION_LOCATION_TEXT[locationKey] || "nad polami płucnymi";
  const detailOptions = AUSCULTATION_DETAIL_OPTIONS[findingKey] || [];
  const detailItem = detailOptions.find(([value]) => value === detailValue);
  const detailText = detailItem ? detailItem[1] : "";
  const base = AUSCULTATION_FINDING_BASE[findingKey] || "Nieprawidłowe osłuchowo";

  let sentence = "";
  switch (findingKey) {
    case "weakened":
      sentence = `${base} ${locationText}${detailText ? ", " + detailText : ""}.`;
      break;
    case "crackles":
      sentence = `Rzężenia ${detailText} ${locationText}.`;
      break;
    case "crepitations":
      sentence = `Trzeszczenia ${locationText}${detailText ? ", " + detailText : ""}.`;
      break;
    case "wheezes":
      sentence = `Świsty i furczenia, ${detailText}, wysłuchiwane ${locationText}.`;
      break;
    case "bronchial":
      sentence = `Szmer oskrzelowy ${locationText}${detailText ? ", " + detailText : ""}.`;
      break;
    case "friction":
      sentence = `Tarcie opłucnowe ${detailText} ${locationText}.`;
      break;
    case "absent":
      sentence = `Brak szmeru pęcherzykowego ${locationText} — ${detailText}.`;
      break;
    default:
      sentence = `${base} ${locationText}.`;
  }

  return sentence.replace(/\s+/g, " ").trim();
}

function getQualificationAdjective(sex, isNegative = false) {
  if (sex === "female") {
    return isNegative ? "niezakwalifikowana" : "zakwalifikowana";
  }

  if (sex === "male") {
    return isNegative ? "niezakwalifikowany" : "zakwalifikowany";
  }

  return isNegative ? "niezakwalifikowany/a" : "zakwalifikowany/a";
}

function getQualificationTypeText(type, customType) {
  const selectedType = customType && type === "__other__" ? customType.trim() : type;
  const typeText = {
    ogólne: "znieczulenia ogólnego",
    ogólne_intubacja: "znieczulenia ogólnego z intubacją",
    ogólne_bez_intubacji: "znieczulenia ogólnego bez intubacji",
    przewodowe: "znieczulenia przewodowego",
    regionalne: "znieczulenia regionalnego",
    blokada: "blokady nerwów obwodowych",
    sedacja: "analgo-sedacji z nadzorem anestezjologicznym",
  }[selectedType] || selectedType || "znieczulenia";

  return typeText;
}

function getQualificationText(sex) {
  const status = getValue("qualificationStatus");
  const risk = getValue("qualificationRisk");
  const type = getValue("qualificationType");
  const customType = getValue("qualificationTypeCustom");
  const condition = getValue("qualificationCondition");

  if (status === "partial") {
    return condition
      ? `warunkowo — ${condition}`
      : "warunkowo";
  }

  if (status === "not-qualified") {
    return `${getQualificationAdjective(sex, true)} do znieczulenia`;
  }

  const typeText = getQualificationTypeText(type, customType);
  const riskText = risk === "wysokie"
    ? "wysokim ryzykiem powikłań"
    : risk === "średnie"
      ? "średnim ryzykiem powikłań"
      : "niskim ryzykiem powikłań";
  return `${getQualificationAdjective(sex)} do ${typeText} z ${riskText}`;
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

function parseMedicationsTxt(raw) {
  const medications = [];
  const lines = raw.split("\n");

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3) return;

    const [name, activeSubstances, type] = parts;
    medications.push({
      name,
      activeSubstances: activeSubstances
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      type,
    });
  });

  return medications;
}

function populateMedicationSuggestions() {
  const input = document.getElementById("medicationsList");
  const suggestionsBox = document.getElementById("medicationSuggestionsBox");
  if (!input || !suggestionsBox) return;

  const replaceLastToken = (fullValue, replacement) => {
    const parts = fullValue.split(/[,;\n]+/);
    const lastPart = parts[parts.length - 1] || "";
    const prefix = fullValue.slice(0, fullValue.length - lastPart.length);
    return `${prefix}${replacement}`;
  };

  const renderSuggestions = (query = "") => {
    const currentValue = input.value;
    const lastChunk = currentValue.split(/[,;\n]+/).pop()?.trim() || "";
    const normalized = lastChunk.toLowerCase();
    const matches = MEDICATIONS_DB.filter((medication) => medication.name.toLowerCase().includes(normalized));

    suggestionsBox.innerHTML = "";
    if (!normalized || !matches.length) {
      suggestionsBox.style.display = "none";
      return;
    }

    suggestionsBox.style.display = "block";
    matches.slice(0, 8).forEach((medication, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = `medication-suggestion${index === 0 ? " active" : ""}`;
      option.textContent = medication.name;
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        const currentValue = input.value;
        input.value = replaceLastToken(currentValue, medication.name);
        suggestionsBox.style.display = "none";
        generate();
      });
      suggestionsBox.appendChild(option);
    });
  };

  input.addEventListener("input", () => {
    renderSuggestions(input.value);
    generate();
  });

  input.addEventListener("focus", () => renderSuggestions(input.value));

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".medication-input") && !event.target.closest(".medication-suggestions")) {
      suggestionsBox.style.display = "none";
    }
  });
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

  const otherOption = document.createElement("option");
  otherOption.value = "__other__";
  otherOption.textContent = "Inny dział…";
  departmentSelect.appendChild(otherOption);
}

function populateProcedureSelect(department) {
  const procedureSelect = document.getElementById("procedure");
  const procedureGroup = document.getElementById("otherProcedureGroup");
  procedureSelect.innerHTML = "";
  procedureGroup.style.display = "none";

  if (!department || (!PROCEDURES_BY_DEPARTMENT[department] && department !== "__other__")) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = department ? "Brak procedur dla wybranego działu" : "Wybierz dział najpierw";
    placeholder.disabled = true;
    placeholder.selected = true;
    procedureSelect.appendChild(placeholder);
    procedureSelect.disabled = true;
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Wybierz zabieg…";
  placeholder.disabled = true;
  placeholder.selected = true;
  procedureSelect.appendChild(placeholder);

  if (department === "__other__") {
    const otherOption = document.createElement("option");
    otherOption.value = "__other__";
    otherOption.textContent = "Inny…";
    procedureSelect.appendChild(otherOption);
    procedureSelect.disabled = false;
    return;
  }

  const options = PROCEDURES_BY_DEPARTMENT[department];
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

async function loadMedications() {
  if (window.location.protocol === "file:") {
    MEDICATIONS_DB = parseMedicationsTxt(DEFAULT_MEDICATIONS_TEXT);
    populateMedicationSuggestions();
    return;
  }

  try {
    const res = await fetch("medications.txt", { cache: "no-store" });
    const raw = await res.text();
    MEDICATIONS_DB = parseMedicationsTxt(raw);
    if (!MEDICATIONS_DB.length) {
      console.warn("medications.txt loaded but no entries were parsed. Falling back to default medication list.");
      MEDICATIONS_DB = parseMedicationsTxt(DEFAULT_MEDICATIONS_TEXT);
    }
    populateMedicationSuggestions();
  } catch (e) {
    console.error("Could not load medications.txt", e);
    MEDICATIONS_DB = parseMedicationsTxt(DEFAULT_MEDICATIONS_TEXT);
    populateMedicationSuggestions();
  }
}

function getMedicationDisplayText(rawInput) {
  const entries = rawInput
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries.length) return "";

  return entries
    .map((entry) => {
      const match = MEDICATIONS_DB.find((medication) => medication.name.toLowerCase() === entry.toLowerCase());
      if (!match) return entry;

      const substancesText = match.activeSubstances.length ? match.activeSubstances.join(", ") : "";
      const typeText = match.type ? match.type : "";
      const detailParts = [substancesText, typeText].filter(Boolean);
      const detailsText = detailParts.length ? detailParts.join("; ") : "";
      return detailsText ? `${entry} (${detailsText})` : entry;
    })
    .join(", ");
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
  const illnesses = [];
  const diseaseText = getValue("disease");
  const department = getValue("department");
  const procedure = getValue("procedure");
  const otherDepartment = getValue("otherDepartment");
  const otherProcedure = getValue("otherProcedure");
  const medicationInput = getValue("medicationsList");
  const medicationEntries = medicationInput
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (diseaseText) illnesses.push(diseaseText);

  const genderFields = getGenderFields(sex);
  const selectedDepartment = department === "__other__" ? (otherDepartment || "Inny dział") : department;
  const asaValue = getValue("asaScaleValue") || "I";
  const asaEmergency = document.getElementById("asaEmergency")?.checked;
  const asaScale = `ASA ${asaValue}${asaEmergency ? " E" : ""}`;

  const fields = {
    ...genderFields,
    Age: getValue("age"),
    Mass: getValue("mass"),
    Height: getValue("height"),
    Department: selectedDepartment,
    Operation: otherProcedure || procedure,
    Neurological_Signs: getValue("neurologicalSigns"),
    Respiratory_Rate: getValue("respiratoryRate"),
    Saturation: getValue("saturation"),
    Lung_Auscultation: getAuscultationText(),
    Blood_Preasure: getValue("bloodPressure"),
    Heart_Rate: getValue("heartRate"),
    Arytmia: getValue("arytmia"),
    Oedema: getValue("oedema"),
    Disease: diseaseText || illnesses.join(", "),
    Medications: getMedicationDisplayText(medicationInput),
    Alergie: getValue("allergies"),
    Smoking: getValue("smoking"),
    Drugs: getValue("drugs"),
    Qualification_Result: getQualificationText(sex),
    ASA_Scale: asaScale,
    Mallampathi_Scale: getValue("mallampathiScale"),
    Neck_Mobility: getValue("neckMobility"),
    Teeth_condition: getValue("teethCondition"),
    Recomendation_General: getValue("recommendationGeneral"),
    Recomendation_Medication: getValue("recommendationMedication"),
  };

  return { age, sex, illnesses, medications: medicationEntries, fields };
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

function handleDepartmentChange() {
  const departmentSelect = document.getElementById("department");
  const otherDepartmentGroup = document.getElementById("otherDepartmentGroup");
  if (departmentSelect.value === "__other__") {
    otherDepartmentGroup.style.display = "block";
  } else {
    otherDepartmentGroup.style.display = "none";
  }
  populateProcedureSelect(departmentSelect.value);
  handleProcedureChange();
}

function toggleQualificationTypeCustom() {
  const qualificationType = document.getElementById("qualificationType");
  const qualificationTypeCustomGroup = document.getElementById("qualificationTypeCustomGroup");
  if (!qualificationType || !qualificationTypeCustomGroup) return;
  qualificationTypeCustomGroup.style.display = qualificationType.value === "__other__" ? "block" : "none";
}

window.addEventListener("DOMContentLoaded", async () => {
  populateDepartmentSelect("Wczytywanie działów…");
  populateProcedureSelect("");
  await Promise.all([loadRules(), loadProcedures(), loadMedications()]);
  document.getElementById("department").addEventListener("change", handleDepartmentChange);
  document.getElementById("procedure").addEventListener("change", handleProcedureChange);
  const auscultationGeneral = document.getElementById("auscultationGeneral");
  const auscultationFinding = document.getElementById("auscultationFinding");
  const auscultationLocation = document.getElementById("auscultationLocation");
  const auscultationDetail = document.getElementById("auscultationDetail");
  const qualificationStatus = document.getElementById("qualificationStatus");
  const qualificationQualifiedBlock = document.getElementById("qualificationQualifiedBlock");
  const qualificationPartialBlock = document.getElementById("qualificationPartialBlock");
  const qualificationType = document.getElementById("qualificationType");
  const qualificationTypeCustom = document.getElementById("qualificationTypeCustom");
  const asaEmergency = document.getElementById("asaEmergency");
  const medicationsList = document.getElementById("medicationsList");
  if (auscultationGeneral) {
    auscultationGeneral.addEventListener("change", () => {
      toggleAuscultationDetails();
      generate();
    });
  }
  [auscultationFinding, auscultationLocation, auscultationDetail].forEach((el) => {
    if (el) {
      el.addEventListener("change", () => {
        populateAuscultationDetails();
        generate();
      });
    }
  });
  if (qualificationStatus) {
    qualificationStatus.addEventListener("change", () => {
      if (qualificationQualifiedBlock && qualificationPartialBlock) {
        const showQualified = qualificationStatus.value === "qualified";
        qualificationQualifiedBlock.style.display = showQualified ? "block" : "none";
        qualificationPartialBlock.style.display = qualificationStatus.value === "partial" ? "block" : "none";
      }
      generate();
    });
  }

  if (qualificationType) {
    qualificationType.addEventListener("change", () => {
      toggleQualificationTypeCustom();
      generate();
    });
  }

  if (qualificationTypeCustom) {
    qualificationTypeCustom.addEventListener("input", generate);
  }

  if (asaEmergency) {
    asaEmergency.addEventListener("change", generate);
  }

  if (medicationsList) {
    medicationsList.addEventListener("input", generate);
  }

  populateAuscultationDetails();
  toggleAuscultationDetails();
  toggleQualificationTypeCustom();
  document.getElementById("generateBtn").addEventListener("click", generate);
  document.getElementById("copyBtn").addEventListener("click", copyOutput);
  document.getElementById("downloadBtn").addEventListener("click", downloadOutput);
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("patientForm").reset();
    document.getElementById("reportBody").innerHTML = '<span class="empty">Wypełnij dane pacjenta i kliknij "Generuj notatkę", aby wygenerować tekst tutaj.</span>';
    document.getElementById("tagRow").innerHTML = "";
    document.getElementById("otherProcedureGroup").style.display = "none";
    document.getElementById("otherDepartmentGroup").style.display = "none";
    const resultSelect = document.getElementById("auscultationGeneral");
    if (resultSelect) {
      resultSelect.value = "prawidłowy";
    }
    const qualificationStatusReset = document.getElementById("qualificationStatus");
    if (qualificationStatusReset) {
      qualificationStatusReset.value = "qualified";
    }
    const qualificationTypeReset = document.getElementById("qualificationType");
    if (qualificationTypeReset) {
      qualificationTypeReset.value = "ogólne";
    }
    const qualificationTypeCustomReset = document.getElementById("qualificationTypeCustom");
    if (qualificationTypeCustomReset) {
      qualificationTypeCustomReset.value = "";
    }
    const asaScaleValueReset = document.getElementById("asaScaleValue");
    if (asaScaleValueReset) {
      asaScaleValueReset.value = "I";
    }
    const asaEmergencyReset = document.getElementById("asaEmergency");
    if (asaEmergencyReset) {
      asaEmergencyReset.checked = false;
    }
    const mallampathiScaleReset = document.getElementById("mallampathiScale");
    if (mallampathiScaleReset) {
      mallampathiScaleReset.value = "I";
    }
    const medicationInputReset = document.getElementById("medicationsList");
    if (medicationInputReset) {
      medicationInputReset.value = "";
    }
    if (qualificationQualifiedBlock) {
      qualificationQualifiedBlock.style.display = "block";
    }
    if (qualificationPartialBlock) {
      qualificationPartialBlock.style.display = "none";
    }
    toggleQualificationTypeCustom();
    const details = document.getElementById("auscultationAbnormalBlock");
    if (details) {
      details.style.display = "none";
    }
    const findingSelect = document.getElementById("auscultationFinding");
    if (findingSelect) {
      findingSelect.value = "weakened";
    }
    const locationSelect = document.getElementById("auscultationLocation");
    if (locationSelect) {
      locationSelect.value = "bilateral";
    }
    populateAuscultationDetails();
    populateDepartmentSelect();
    populateProcedureSelect("");
  });
});
