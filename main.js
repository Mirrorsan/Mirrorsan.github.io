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
  document.getElementById('lbl-support-legend').textContent = cfg.QUESTIONS.supportNeeded.legend;
  document.getElementById('lbl-support-additional').textContent = cfg.QUESTIONS.supportNeeded.options.additionalResources;
  document.getElementById('lbl-support-training').textContent = cfg.QUESTIONS.supportNeeded.options.training;
  document.getElementById('lbl-support-managerial').textContent = cfg.QUESTIONS.supportNeeded.options.managerialSupport;
  document.getElementById('lbl-support-collab').textContent = cfg.QUESTIONS.supportNeeded.options.collaboration;
  document.getElementById('lbl-support-other').textContent = cfg.QUESTIONS.supportNeeded.options.other;

  // ---------- Helpers ----------
  function makeItemRow(placeholder = 'Type here...', multiline = false) {
    const wrap = document.createElement('div');
    wrap.className = 'item-row';

    const field = multiline ? document.createElement('textarea') : document.createElement('input');
    if (!multiline) field.type = 'text';
    field.placeholder = placeholder;
    field.required = false;

    if (multiline) {
      field.rows = 3;                 // initial height
      field.style.resize = 'vertical';
    }

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn ghost';
    del.textContent = 'Remove';
    del.onclick = () => wrap.remove();

    wrap.appendChild(field);
    wrap.appendChild(del);
    return wrap;
  }

  // เก็บค่าจากทั้ง input และ textarea (คืนค่าเป็น array ของสตริง)
  const getValues = (root, selector) =>
    [...root.querySelectorAll(selector)]
      .map(el => el.value.trim())
      .filter(Boolean);

  function addDefaultLines() {
    // Projects → textarea
    projectsList.appendChild(makeItemRow('Project Name / details', true));

    // Concerns / Risks / Issues → textarea
    ['concerns','risks','issues'].forEach(id => {
      document.getElementById(id).appendChild(makeItemRow('Add item', true));
    });
  }

  addProjectBtn.onclick = () =>
    projectsList.appendChild(makeItemRow('Project Name / details', true));

  addLineButtons.forEach(btn => {
    btn.onclick = () =>
      document.getElementById(btn.dataset.target).appendChild(makeItemRow('Add item', true));
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

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;                  // 🔒 lock
    submitBtn.textContent = 'Submitting...';    // UX feedback
    msg.textContent = 'Submitting...';

    try {
      const data = new FormData(form);

      // ✅ รองรับทั้ง input และ textarea โดย payload ยังเป็น array ของสตริงเหมือนเดิม
      const projects = getValues(projectsList, 'input[type="text"], textarea');
      const concerns = getValues(document, '#concerns input, #concerns textarea');
      const risks    = getValues(document, '#risks input, #risks textarea');
      const issues   = getValues(document, '#issues input, #issues textarea');

      const support = {
        additionalResources: form.querySelector('input[name="support_additionalResources"]').checked,
        training:            form.querySelector('input[name="support_training"]').checked,
        managerialSupport:   form.querySelector('input[name="support_managerialSupport"]').checked,
        collaboration:       form.querySelector('input[name="support_collaboration"]').checked,
        other:               form.querySelector('input[name="support_other"]').checked
      };

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
        support
      };

      const token = await getRecaptchaToken();
      console.log('[recaptcha] token len =', token && token.length);
      payload.recaptchaToken = token;

      // หมายเหตุ: ถ้า backend ตั้ง CORS แล้ว จะใส่ header Content-Type ก็ได้
      const res = await fetch(cfg.API_ENDPOINT, {
        method: 'POST',
        // headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'submit', payload })
      });

      // บางสภาพแวดล้อมคืนเป็น text — parse ให้ robust
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); }
      catch { throw new Error('Invalid server response'); }

      if (!json.ok) throw new Error(json.error || 'Submit failed');

      msg.textContent = '✅ Submitted! Thank you.';
      form.reset();
      projectsList.innerHTML = '';
      ['concerns','risks','issues'].forEach(id => (document.getElementById(id).innerHTML = ''));
      addDefaultLines();
    } catch (err) {
      console.error(err);
      msg.textContent = `❌ ${err.message}`;
    } finally {
      submitBtn.disabled = false;               // 🔓 unlock
      submitBtn.textContent = 'Submit';         // restore label
    }
  });
})();
