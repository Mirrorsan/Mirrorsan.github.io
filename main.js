
(function() {
  const cfg = window.APP_CONFIG;
  const form = document.getElementById('report-form');
  const msg = document.getElementById('msg');
  const projectsList = document.getElementById('projects');

  const addProjectBtn = document.getElementById('add-project');
  const addLineButtons = document.querySelectorAll('.add-line[data-target]');

  // Set labels from config
  document.getElementById('lbl-key').textContent = cfg.QUESTIONS.executiveSummary.keyHighlights;
  document.getElementById('lbl-upcoming').textContent = cfg.QUESTIONS.executiveSummary.upcomingFocus;
  document.getElementById('lbl-psh').textContent = cfg.QUESTIONS.executiveSummary.projectSpecificHighlights;
  document.getElementById('lbl-cta').textContent = cfg.QUESTIONS.executiveSummary.callToAction;
  document.getElementById('lbl-concerns').textContent = cfg.QUESTIONS.concerns.concerns;
  document.getElementById('lbl-risks').textContent = cfg.QUESTIONS.concerns.risks;
  document.getElementById('lbl-issues').textContent = cfg.QUESTIONS.concerns.issues;

  // Helpers
  function makeItemRow(placeholder='Type here...') {
    const wrap = document.createElement('div');
    wrap.className = 'item-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.required = false;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn ghost';
    del.textContent = 'Remove';
    del.onclick = () => wrap.remove();
    wrap.appendChild(input);
    wrap.appendChild(del);
    return wrap;
  }

  function addDefaultLines() {
    projectsList.appendChild(makeItemRow('Project Name'));
    ['concerns','risks','issues'].forEach(id => {
      document.getElementById(id).appendChild(makeItemRow('Add item'));
    });
  }

  addProjectBtn.onclick = () => projectsList.appendChild(makeItemRow('Project Name'));
  addLineButtons.forEach(btn => {
    btn.onclick = () => document.getElementById(btn.dataset.target).appendChild(makeItemRow('Add item'));
  });

  window.addEventListener('load', addDefaultLines);

  async function getRecaptchaToken() {
  const key = cfg.RECAPTCHA_SITE_KEY;
  if (!key) return '';
  let tries = 0;
  return new Promise(resolve => {
    const wait = () => {
      tries++;
      if (window.grecaptcha && grecaptcha.execute) {
        grecaptcha.ready(() => {
          grecaptcha.execute(key, { action: 'submit' })
            .then(t => resolve(t))
            .catch(() => resolve(''));
        });
      } else if (tries < 30) {
        setTimeout(wait, 100); // retry up to ~3s
      } else {
        resolve('');
      }
    };
    wait();
  });
}


  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = 'Submitting...';

    try {
      const data = new FormData(form);
      const projects = [...projectsList.querySelectorAll('input[type=text]')]
        .map(i => i.value.trim()).filter(Boolean);

      const concerns = [...document.querySelectorAll('#concerns input')].map(i => i.value.trim()).filter(Boolean);
      const risks    = [...document.querySelectorAll('#risks input')].map(i => i.value.trim()).filter(Boolean);
      const issues   = [...document.querySelectorAll('#issues input')].map(i => i.value.trim()).filter(Boolean);

      const payload = {
        firstName: (data.get('firstName') || '').trim(),
        lastName: (data.get('lastName') || '').trim(),
        projects,
        executiveSummary: {
          keyHighlights: (data.get('keyHighlights') || '').trim(),
          upcomingFocus: (data.get('upcomingFocus') || '').trim(),
          projectSpecificHighlights: (data.get('projectSpecificHighlights') || '').trim(),
          callToAction: (data.get('callToAction') || '').trim()
        },
        concerns: { concerns, risks, issues },
      };

      const token = await getRecaptchaToken();
      console.log('[recaptcha] token len =', token && token.length);   // <— add this
      payload.recaptchaToken = token;

      const res = await fetch(`${cfg.API_ENDPOINT}`, {
        method: 'POST',
        // headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ op: 'submit', payload })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Submit failed');

      msg.textContent = '✅ Submitted! Thank you.';
      form.reset();
      projectsList.innerHTML = '';
      ['concerns','risks','issues'].forEach(id => document.getElementById(id).innerHTML = '');
      addDefaultLines();
    } catch (err) {
      console.error(err);
      msg.textContent = `❌ ${err.message}`;
    }
  });
})();
