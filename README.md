# Anesthesia Qualification Note Generator

A small static site that turns patient data (age, sex, illnesses, chronic
diseases, medication) into a text note for anesthesia preoperative
documentation, based on rules you control in `rules.txt`.

## Files

- `index.html` — the form patients/staff use, plus the generated note
- `style.css` — visual styling
- `app.js` — reads `rules.txt`, evaluates rules against the form, builds the note
- `rules.txt` — your editable rule definitions (see syntax below)
- `admin.html` / `admin.js` — password-gated page to view/edit rules.txt

## Default admin password

```
anesthesia2026
```

Change it before going live — instructions are in the comments at the top
of `admin.js`. **Important:** this is a client-side password check only.
Since GitHub Pages (and most free static hosts) can't run server code,
this gate stops casual visitors but not a determined one who reads the
page source. Don't rely on it to protect anything truly sensitive — if you
need real access control later, you'll want a small backend (e.g. a cheap
serverless function or a host like Netlify/Vercel with auth, or a simple
Node/Flask backend).

## Editing rules

Open `admin.html`, unlock with the password, and edit the rules text
directly in the browser. Editing there does **not** save back to GitHub —
click "Download rules.txt", then replace the file in your project folder
and commit/push (or re-upload, depending on host).

You can also just open `rules.txt` directly in any text editor and edit
it there — that works too, and is simpler for you specifically since you
already have repo access.

### Rule syntax

```
IF <field> <operator> "<value>" THEN <ACTION> "<text>"
```

Join multiple conditions with `AND`:

```
IF <field> <operator> "<value>" AND <field> <operator> "<value>" THEN <ACTION> "<text>"
```

- **fields:** `sex`, `age`, `illness`, `medication`
- **operators:** `CONTAINS`, `EQUALS`, `>`, `>=`, `<`, `<=`
- **actions:** `ADD_CONSULTATION`, `ADD_NOTE`, `ADD_WARNING`
- lines starting with `#` are comments

Example:

```
IF illness CONTAINS "Heart failure" THEN ADD_CONSULTATION "Cardiology consultation required."
IF medication CONTAINS "ACEI" AND age >= 65 THEN ADD_NOTE "Withhold ACE inhibitor on day of surgery; monitor closely given age."
```

`illness` and `medication` conditions match against everything that's
checked in the form (plus anything typed in the "Other" free-text boxes),
so `CONTAINS "ACEI"` matches if any selected item contains that text.

## Adding new checkboxes

The checkbox lists in `index.html` (under "Illnesses & chronic diseases"
and "Current medication") are a starting set based on common anesthesia
preop concerns. Add more `<label class="check-item">` lines the same way
existing ones are written, using whatever `value="..."` text you then
reference in `rules.txt`.

## Hosting on GitHub Pages

1. Create a new GitHub repository, push these files to it
2. In the repo, go to **Settings → Pages**
3. Under "Build and deployment", choose **Deploy from a branch**, pick
   `main` (or `master`) and `/ (root)`, save
4. GitHub will give you a URL like `https://yourname.github.io/reponame/`
   — that's your live site
5. To update rules later, edit `rules.txt` in the repo (directly on
   GitHub.com works fine for small edits) and the live site updates
   automatically within a minute or two

## Important caveat

This tool generates draft text to assist documentation — it does not
replace clinical judgment, and the rule logic should be reviewed by
qualified anesthesiology staff before being relied on in practice.
