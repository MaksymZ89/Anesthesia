// =====================================================================
// admin.js — password gate + rules.txt editor
// =====================================================================
//
// DEFAULT PASSWORD: anesthesia2026
// (change it — see instructions below)
//
// HOW TO CHANGE THE PASSWORD:
//   1. Set NEW_PASSWORD below to the password you want, e.g. "myNewPass123"
//   2. Save this file and reload admin.html in the browser
//   3. Open the browser console (F12 → Console tab) — the new hash will
//      be printed there
//   4. Copy that hash and paste it as the value of PASSWORD_HASH below
//   5. Set NEW_PASSWORD back to "" and save again
//
// This is a CLIENT-SIDE check only — anyone who reads this file's source
// could see the hash and brute-force it offline, or simply remove the
// check. It's a basic deterrent for a small free-tier static site, not
// real authentication. For real security you would need a backend.
// =====================================================================

const PASSWORD_HASH = "5f39c3adb5a546385f0560cddcabcc47c1d338194a58ddbb0d34efdfccd449ed"; // = "anesthesia2026"
const NEW_PASSWORD = ""; // temporarily set this to print a new hash to the console

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkPassword(input) {
  const hash = await sha256(input);
  return hash === PASSWORD_HASH;
}

function showAdminPanel() {
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
  loadRulesIntoEditor();
}

async function loadRulesIntoEditor() {
  try {
    const res = await fetch("rules.txt", { cache: "no-store" });
    const text = await res.text();
    document.getElementById("rulesEditor").value = text;
    document.getElementById("parseStatus").textContent = "";
  } catch (e) {
    document.getElementById("rulesEditor").value = "";
    document.getElementById("parseStatus").textContent = "Could not load rules.txt — check it exists in the project folder.";
  }
}

function downloadRulesFile() {
  const text = document.getElementById("rulesEditor").value;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rules.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// Minimal validation mirroring app.js parser, just to flag bad lines here.
function validateRules() {
  const text = document.getElementById("rulesEditor").value;
  const lines = text.split("\n");
  const errors = [];
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const m = line.match(/^IF\s+(.+?)\s+THEN\s+(ADD_CONSULTATION|ADD_NOTE|ADD_WARNING)\s+"(.*)"\s*$/i);
    if (!m) {
      errors.push(`Line ${idx + 1}: could not parse`);
      return;
    }
    const condTokens = m[1].split(/\s+AND\s+/i);
    for (const tok of condTokens) {
      if (!tok.trim().match(/^(\w+)\s+(CONTAINS|EQUALS|>=|<=|>|<)\s+"(.*)"$/i)) {
        errors.push(`Line ${idx + 1}: bad condition — "${tok.trim()}"`);
      }
    }
  });

  const statusEl = document.getElementById("parseStatus");
  if (errors.length === 0) {
    statusEl.style.color = "var(--teal)";
    statusEl.textContent = `Looks good — no syntax errors found.`;
  } else {
    statusEl.style.color = "var(--red)";
    statusEl.textContent = errors.join(" · ");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  if (NEW_PASSWORD) {
    const hash = await sha256(NEW_PASSWORD);
    console.log("New password hash (paste into PASSWORD_HASH):", hash);
  }

  document.getElementById("unlockBtn").addEventListener("click", async () => {
    const input = document.getElementById("pwInput").value;
    const ok = await checkPassword(input);
    if (ok) {
      showAdminPanel();
    } else {
      document.getElementById("pwError").textContent = "Incorrect password.";
    }
  });

  document.getElementById("pwInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("unlockBtn").click();
  });

  document.getElementById("downloadRulesBtn")?.addEventListener("click", downloadRulesFile);
  document.getElementById("reloadRulesBtn")?.addEventListener("click", loadRulesIntoEditor);
  document.getElementById("validateBtn")?.addEventListener("click", validateRules);
});
