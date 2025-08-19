
(function() {
  const cfg = window.APP_CONFIG;
  let idToken = null;

  function renderSignin() {
    google.accounts.id.initialize({
      client_id: cfg.OAUTH_CLIENT_ID,
      callback: (response) => {
        idToken = response.credential; // JWT
        document.getElementById('signin').style.display='none';
        document.getElementById('admin-ui').style.display='block';
      }
    });
    google.accounts.id.renderButton(
      document.getElementById('signin'),
      { theme: 'filled_blue', size: 'large', text: 'continue_with', shape: 'pill' }
    );
  }

  window.onload = () => {
    if (window.google?.accounts?.id) renderSignin();
    document.getElementById('btn-refresh').onclick = loadDashboard;
    document.getElementById('btn-export').onclick = exportMonth;
    document.getElementById('btn-dryrun').onclick = () => rollover(true);
    document.getElementById('btn-roll').onclick   = () => rollover(false);
  };

  async function api(op, body={}) {
    const res = await fetch(cfg.API_ENDPOINT, {
      method: 'POST',
      // headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ op, idToken, ...body })
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'API error');
    return json;
  }

  function getMonthInput(id) {
    const v = document.getElementById(id).value;
    if (!v) throw new Error('Please select month');
    return v; // YYYY-MM
  }

  async function loadDashboard() {
    try {
      const month = getMonthInput('monthPicker');
      const r = await api('dashboard', { month });
      const { submissions, latest5 } = r.data;
      const dash = document.getElementById('dash');
      dash.innerHTML = `
        <p><b>Total submissions:</b> ${submissions}</p>
        <details><summary>Latest 5</summary>
          <ol>${latest5.map(x=>`<li>${x.submittedAt} — ${x.firstName} ${x.lastName} [${x.projects}]</li>`).join('')}</ol>
        </details>
      `;
    } catch (e) {
      alert(e.message);
    }
  }

  async function exportMonth() {
    const exportMsg = document.getElementById('exportMsg');
    exportMsg.textContent = 'Exporting...';
    try {
      const month = getMonthInput('monthPicker');
      const r = await api('exportXlsx', { month });
      exportMsg.innerHTML = `✅ Ready: <a href="${r.data.downloadUrl}" target="_blank" rel="noopener">Download .xlsx</a>`;
    } catch (e) {
      exportMsg.textContent = `❌ ${e.message}`;
    }
  }

  async function rollover(dryRun=false) {
    const rollMsg = document.getElementById('rollMsg');
    rollMsg.textContent = dryRun ? 'Dry-run...' : 'Rolling...';
    try {
      const from = getMonthInput('fromMonth');
      const to = getMonthInput('toMonth');
      const mode = document.getElementById('rollMode').value;
      const r = await api('rollover', { from, to, mode, dryRun });
      rollMsg.textContent = dryRun
        ? `Preview: ${r.data.count} submissions will be ${mode}d.`
        : `✅ ${r.data.moved} ${mode}d. Audit logged.`;
    } catch (e) {
      rollMsg.textContent = `❌ ${e.message}`;
    }
  }
})();
