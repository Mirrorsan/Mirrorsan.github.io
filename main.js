// main.js
(function () {
  const cfg = window.APP_CONFIG; // ต้องมีใน config.js

  /* -------------------- utils -------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);

  function safeJSON(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function assertRecaptchaConfig() {
    const key = window.APP_CONFIG && window.APP_CONFIG.RECAPTCHA_SITE_KEY;
    if (!key) throw new Error('Missing RECAPTCHA_SITE_KEY in APP_CONFIG');
    return key;
  }

  let __recaptchaLoadPromise;
  function loadRecaptcha() {
    const key = assertRecaptchaConfig();
    if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
    if (__recaptchaLoadPromise) return __recaptchaLoadPromise;

    const url = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(key);
    __recaptchaLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true; s.defer = true;
      s.onload = () => resolve(window.grecaptcha);
      s.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
      document.head.appendChild(s);
    });
    return __recaptchaLoadPromise;
  }

  async function getRecaptchaToken(action = 'submit') {
    const key = assertRecaptchaConfig();
    await loadRecaptcha();
    await new Promise(res => grecaptcha.ready(res));
    return grecaptcha.execute(key, { action });
  }

  (function(){
    const p = location.pathname.toLowerCase();
    const active = p.includes('admin') ? 'navAdmin' : 'navSubmit';
    document.getElementById(active)?.classList.add('active');
  })();

  /* -------------------- form status -------------------- */
  // เช็คสถานะฟอร์ม (ทน CORS/redirect + มี timeout)
  async function fetchFormStatus() {
    const statusUrl = (cfg.STATUS_ENDPOINT || '').trim();
    const apiUrl    = (cfg.API_ENDPOINT   || '').trim();

    const parse = (txt) => {
      try {
        const j = JSON.parse(txt);
        return (j && j.ok && j.data && typeof j.data.open === 'boolean') ? j.data : null;
      } catch { return null; }
    };

    if (statusUrl) {
      try {
        const r = await fetch(`${statusUrl}${statusUrl.includes('?') ? '&' : '?'}op=formStatus&_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          redirect: 'follow',
        });
        const t = await r.text();
        const d = parse(t);
        if (d) return d;
        console.warn('[status] googleusercontent GET returned non-JSON:', t.slice(0, 120));
      } catch (e) {
        console.warn('[status] googleusercontent GET failed:', e);
      }
    }

    if (apiUrl) {
      const execUrl = apiUrl.replace(/\/u\/\d+\//, '/');
      try {
        const r1 = await fetch(`${execUrl}${execUrl.includes('?') ? '&' : '?'}op=formStatus&_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          redirect: 'follow',
        });
        const t1 = await r1.text();
        const d1 = parse(t1);
        if (d1) return d1;
        console.warn('[status] exec GET returned non-JSON:', t1.slice(0, 120));
      } catch (e) {
        console.warn('[status] exec GET failed:', e);
      }

      try {
        const r2 = await fetch(execUrl, {
          method: 'POST',
          body: JSON.stringify({ op: 'formStatus' }),
          cache: 'no-store',
          redirect: 'follow',
        });
        const t2 = await r2.text();
        const d2 = parse(t2);
        if (d2) return d2;
        console.warn('[status] exec POST returned non-JSON:', t2.slice(0, 120));
      } catch (e) {
        console.warn('[status] exec POST failed:', e);
      }
    }

    return { open: false, reason: 'status_unreachable' };
  }

  async function guardOpenOrRedirect() {
    const status = await fetchFormStatus();
    if (status.open === true) return true;
    try { window.location.replace('formclose.html'); }
    catch { window.location.href = 'formclose.html'; }
    return false;
  }

  /* -------------------- UI helpers (textarea version) -------------------- */
  // แถวรายการที่ใช้ <textarea> แทน <input> สำหรับ Projects/Concerns/Risks/Issues
  function makeItemRow(placeholder = 'Type here...') {
    const wrap = document.createElement('div');
    wrap.className = 'item-row';

    const field = document.createElement('textarea');
    field.placeholder = placeholder;
    field.rows = 3;                 // ความสูงเริ่มต้น
    field.style.resize = 'vertical';
    field.required = false;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn ghost';
    del.textContent = 'Remove';
    del.onclick = () => wrap.remove();

    wrap.append(field, del);
    return wrap;
  }

  // ดึงค่าทั้งจาก input และ textarea (payload ยังเป็น array ของสตริงเหมือนเดิม)
  function collectTextList(container) {
    return [...container.querySelectorAll('input[type="text"], textarea')]
      .map(el => el.value.trim())
      .filter(Boolean);
  }

  function addDefaultLines(projectsList) {
    // Projects (textarea)
    projectsList.appendChild(makeItemRow('Project Name / details'));
    // Concerns / Risks / Issues (textarea)
    ['concerns', 'risks', 'issues'].forEach(id => {
      document.getElementById(id).appendChild(makeItemRow('Add item'));
    });
  }

  /* -------------------- main init -------------------- */
  async function init() {
    // 1) guard
    const allowed = await guardOpenOrRedirect();
    if (!allowed) return;

    // 2) element refs
    const form         = $('#report-form');
    const msg          = $('#msg');
    const projectsList = $('#projects');

    const addProjectBtn  = $('#add-project');
    const addLineButtons = document.querySelectorAll('.add-line[data-target]');

    // NEW: refs for Support → Other (must come after form is available)
    const otherCb     = form.querySelector('input[name="support_other"]');
    const otherWrap   = document.getElementById('supp-other-wrap');
    const otherTextEl = document.getElementById('supp-other-text');

    // 3) labels
    $('#lbl-key').textContent       = cfg.QUESTIONS.executiveSummary.keyHighlights;
    $('#lbl-upcoming').textContent  = cfg.QUESTIONS.executiveSummary.upcomingFocus;
    $('#lbl-psh').textContent       = cfg.QUESTIONS.executiveSummary.projectSpecificHighlights;
    $('#lbl-cta').textContent       = cfg.QUESTIONS.executiveSummary.callToAction;

    $('#lbl-concerns').textContent  = cfg.QUESTIONS.concerns.concerns;
    $('#lbl-risks').textContent     = cfg.QUESTIONS.concerns.risks;
    $('#lbl-issues').textContent    = cfg.QUESTIONS.concerns.issues;

    $('#lbl-support-legend').textContent     = cfg.QUESTIONS.supportNeeded.legend;
    $('#lbl-support-additional').textContent = cfg.QUESTIONS.supportNeeded.options.additionalResources;
    $('#lbl-support-training').textContent   = cfg.QUESTIONS.supportNeeded.options.training;
    $('#lbl-support-managerial').textContent = cfg.QUESTIONS.supportNeeded.options.managerialSupport;
    $('#lbl-support-collab').textContent     = cfg.QUESTIONS.supportNeeded.options.collaboration;
    $('#lbl-support-other').textContent      = cfg.QUESTIONS.supportNeeded.options.other;

    // 4) ปุ่มเพิ่มแถว (ทำงานกับ textarea version)
    addProjectBtn.onclick = () =>
      projectsList.appendChild(makeItemRow('Project Name / details'));
    addLineButtons.forEach(btn => {
      btn.onclick = () =>
        document.getElementById(btn.dataset.target).appendChild(makeItemRow('Add item'));
    });

    // แถวเริ่มต้น
    addDefaultLines(projectsList);

    // Show/hide "Other" textarea
    otherCb.addEventListener('change', () => {
      const show = otherCb.checked;
      otherWrap.style.display = show ? 'block' : 'none';
      if (!show) otherTextEl.value = '';
    });
    // sync initial visibility (e.g., if browser restores state)
    otherWrap.style.display = otherCb.checked ? 'block' : 'none';

    // 5) submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      msg.textContent = 'Submitting...';

      try {
        const data = new FormData(form);

        // Build Support payload (with "Other" text)
        const otherChecked = otherCb.checked;
        const otherText    = (otherTextEl.value || '').trim();

        // OPTIONAL validation: require text when "Other" is checked
        if (otherChecked && !otherText) {
          msg.textContent = '❌ Please specify what “Other” support you need.';
          otherTextEl.focus();
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
          return; // stop submit
        }
        const recaptchaToken = await getRecaptchaToken('submit');
        const payload = {
          firstName: (data.get('firstName') || '').trim(),
          lastName:  (data.get('lastName')  || '').trim(),
          projects:  collectTextList(projectsList),
          executiveSummary: {
            keyHighlights:             (data.get('keyHighlights') || '').trim(),
            upcomingFocus:             (data.get('upcomingFocus') || '').trim(),
            projectSpecificHighlights: (data.get('projectSpecificHighlights') || '').trim(),
            callToAction:              (data.get('callToAction') || '').trim()
          },
          concerns: {
            concerns: collectTextList(document.getElementById('concerns')),
            risks:    collectTextList(document.getElementById('risks')),
            issues:   collectTextList(document.getElementById('issues'))
          },
          support: {
            additionalResources: form.querySelector('input[name="support_additionalResources"]').checked,
            training:            form.querySelector('input[name="support_training"]').checked,
            managerialSupport:   form.querySelector('input[name="support_managerialSupport"]').checked,
            collaboration:       form.querySelector('input[name="support_collaboration"]').checked,
            // NEW shape expected by backend _normalizeSupport
            otherChecked,
            otherText
          },
          recaptchaToken
        };

        // ส่งแบบ simple request เลี่ยง preflight/CORS
        const res = await fetch(cfg.API_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify({ op: 'submit', payload }),
          cache: 'no-store'
        });

        const text = await res.text();
        const json = safeJSON(text) || {};
        if (!json.ok) throw new Error(json.error || 'Submit failed');

        msg.textContent = '✅ Submitted! Thank you.';
        form.reset();
        projectsList.innerHTML = '';
        ['concerns','risks','issues'].forEach(id => (document.getElementById(id).innerHTML = ''));
        addDefaultLines(projectsList);

        // reset "Other" UI
        otherWrap.style.display = 'none';
        otherTextEl.value = '';
      } catch (err) {
        console.error(err);
        msg.textContent = `❌ ${err.message || 'Failed to submit'}`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  }

  // bootstrap
  init();
})();
