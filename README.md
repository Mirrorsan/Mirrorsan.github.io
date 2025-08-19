
# Monthly Report Summary — Starter Kit

A complete starter kit for a **Monthly Report Summary** system:
- **Frontend** (static, GitHub Pages): `index.html`, `admin.html`, `styles.css`, `config.js`, `main.js`, `admin.js`
- **Backend** (Google Apps Script + Google Sheets): `apps_script/Code.gs`
- **Template Builder**: Creates Google Sheets template (3 tabs: `EvaluationResponses`, `FlatView`, `EvaluationSummary`)
- **Security**: reCAPTCHA v3 for public form, Google Sign‑In + admin email allowlist for admin panel, audit logging for rollovers

---

## Quick Start (High-level)
1) **Create Google Cloud resources** (if not already):
   - reCAPTCHA v3 **Site Key** & **Secret**
   - Google OAuth **Client ID** (Web application)

2) **Create Drive folder** to store monthly spreadsheets and audit log. Copy its folder ID.

3) **Deploy Apps Script Web App** (`apps_script/Code.gs`):
   - Set Script Properties
   - Enable Advanced Drive Service
   - Deploy as Web app (execute as *Me*, access *Anyone*)
   - Run `buildTemplate` once to create the template and set `TEMPLATE_FILE_ID` automatically

4) **Publish Frontend** to GitHub Pages:
   - Put files in a repo root
   - Update `config.js` with your `API_ENDPOINT`, `RECAPTCHA_SITE_KEY`, `OAUTH_CLIENT_ID`
   - Enable GitHub Pages

5) **Test** the flow:
   - Open `/index.html`, submit a dummy record (passes reCAPTCHA)
   - On `/admin.html`, sign in, pick month, see dashboard, export XLSX, test rollover

---

## Step-by-step Setup

### 1) Prepare Keys & IDs
- **reCAPTCHA v3**
  - Create a site in Google reCAPTCHA admin.
  - Note **Site key** and **Secret**.
- **Google OAuth Client ID (Web) for Admin**
  - In Google Cloud Console → Credentials → Create OAuth client ID.
  - Add your GitHub Pages origin to Authorized JavaScript origins, e.g. `https://<user>.github.io`.
  - Note the **Client ID**.
- **Google Drive Folder for monthly files**
  - Create a folder in Drive; copy its **folder ID** (the long ID in the URL).

### 2) Apps Script Backend
1. Go to [script.google.com](https://script.google.com/), create a new project, and paste contents of `apps_script/Code.gs`.
2. **Services → Advanced Google Services**: Enable **Drive API** (toggle in Apps Script) and also ensure Drive API is enabled in the Cloud project (a dialog link will appear).
3. **Script Properties** (Project Settings → Script properties) — add the following keys:
   - `RECAPTCHA_SECRET` = `<your_recaptcha_v3_secret>`
   - `ADMIN_EMAILS` = `alice@example.com,bob@example.com` (comma-separated list)
   - `MONTHLY_FOLDER_ID` = `<drive_folder_id>`
   - `FILE_PREFIX` = `Monthly Report Summary - `
   - `TIMEZONE` = `Asia/Bangkok` (or your TZ)
   - `OAUTH_CLIENT_ID` = `<your_google_oauth_client_id>`
   - (Optional) `TEMPLATE_FILE_ID` will be **auto-set** by Template Builder; you can leave it blank before running it.
4. **Deploy → New deployment → Web app**
   - *Description:* Monthly Report API
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - Copy the **Web app URL** → use as `API_ENDPOINT` in `config.js`.
5. **Build Template** (one-time)
   - In the Apps Script editor, open the editor’s **Executions** menu or run function `_buildTemplate()` by calling the API via `admin.html` after you sign in, or temporarily add a test `doGet()` to run it once. Easiest path:
     - Temporarily add in the editor: `function runBuildTemplate(){ return _buildTemplate(); }` then click Run.
     - After running successfully, delete `runBuildTemplate()`.
   - On success, Script Property `TEMPLATE_FILE_ID` is automatically populated.

### 3) Frontend (GitHub Pages)
1. Create a new GitHub repository and enable **GitHub Pages** (Pages → Source: Deploy from a branch → `main` / root).
2. Put these files at repo **root**:
   - `index.html`, `admin.html`, `styles.css`, `config.js`, `main.js`, `admin.js`
3. Edit `config.js`:
   - `API_ENDPOINT`: your Apps Script Web App URL
   - `RECAPTCHA_SITE_KEY`: the site key from reCAPTCHA v3
   - `OAUTH_CLIENT_ID`: your Google OAuth client ID
   - (Other labels/questions can be customized under `QUESTIONS`)
4. Commit & push. Visit your GitHub Pages URL to access the form and admin.

### 4) Admin Usage
- Visit `admin.html`, sign in with Google. Only emails in `ADMIN_EMAILS` can use admin features.
- **Dashboard**: Select month → see total submissions + latest 5.
- **Export Excel**: Generates `.xlsx` in your monthly folder; provides a download link.
- **Rollover**: Choose From/To months and **Copy** or **Move** submissions. Use **Dry-run** to preview count. Confirm to act. All actions are **audit logged**.

### 5) Data Model
**EvaluationResponses** columns:
```
submittedAt | monthBucket | surveyId | submissionId | firstName | lastName | projectsJson | executiveSummaryJson | concernsJson
```
- `projectsJson`: stringified array of project names
- `executiveSummaryJson`: object with `keyHighlights`, `upcomingFocus`, `projectSpecificHighlights`, `callToAction`
- `concernsJson`: object with arrays `concerns`, `risks`, `issues`

**FlatView** (formulas auto-expand):
```
firstName | lastName | projects | Key Highlights | Upcoming Focus | Project-Specific Highlights | Call to Action | Concern | Risk | Issue
```

---

## Security Notes
- Keep **secrets** (reCAPTCHA secret, admin emails, folder IDs, OAuth client ID) in **Script Properties** only — never in public JS.
- Admin access is gated by **Google Sign‑In ID token verification** and **email allowlist**.
- All rollovers are appended to an **AuditLog** spreadsheet in the monthly folder.

---

## Troubleshooting
- **reCAPTCHA failed**: Ensure site key/secret are correct and the domain is allowed in reCAPTCHA admin.
- **Unauthorized admin**: Confirm your email is in `ADMIN_EMAILS` and the OAuth **Client ID** matches in Script Properties.
- **Export link not downloadable**: Ensure **Advanced Drive API** is enabled. Also verify you’re logged into the Google account that owns the files.
- **Cross‑origin errors**: Apps Script web apps generally support CORS for JSON; ensure you’re calling the **Web app URL** (not the *dev* URL) and the deployment is set to **Anyone**.

Good luck—ship it! 🚀
