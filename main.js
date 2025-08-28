// main.js
(function () {
  const cfg = window.APP_CONFIG; // ต้องมีใน config.js

  /* -------------------- utils -------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);

  function safeJSON(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  /* -------------------- form status -------------------- */
  // เรียกเช็คสถานะด้วย POST แบบ simple request (ไม่มี headers)
  async function fetchFormStatus() {
    try {
      const res = await fetch(cfg.API_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ op: 'formStatus' }),
        cache: 'no-store'
      });
      const text = await res.text();
      const json = safeJSON(text);
      if (json && json.ok && json.data && typeof json.data.open === 'boolean') {
        return json.data; // { open, mode, schedule, manualWindow, ... }
      }
    } catch (e) {
      console.warn('[status] fetch failed:', e);
    }
    // ถ้าเรียกไม่ได้ ให้ถือว่าปิดเพื่อความปลอดภัย
    return { open: false, reason: 'status_unreachable' };
  }

  async function guardOpenOrRedirect() {
    const status = await fetchFormStatus();

    // เปิดฟอร์ม → ให้ทำงานต่อ
    if (status.open === true) return true;

    // ปิดฟอร์ม → redirect ไปหน้าประกาศปิด
    try { window.location.replace('formclose.html'); }
    catch { window.location.href = 'formclose.html'; }
    return false;
  }

  /* -------------------- reCAPTCHA -------------------- */
  async function getRecaptchaToken() {
    const key = cfg.RECAPTCHA_SITE_KEY;
    if (!key) return '';
    return new Promise(resolve => {
      let tries = 0;
      (function wait() {
        tries++;
        if (window.grecaptcha && grecaptcha.execute) {
          grecaptcha.ready(() => {
            grecaptcha.execute(key, { action: 'submit' })
              .then(t => resolve(t))
              .catch(() => resolve(''));
          });
        } else if (tries < 30) {
          setTimeout(wait, 100); // รอ script โหลด (สูงสุด ~3 วินาที)
        } else {
          resolve('');
        }
      })();
    });
  }

  /* -------------------- UI helpers -------------------- */
  function makeItemRow(placeholder = 'Type here...') {
    const wrap = document.createElement('div');
    wrap.className = 'item-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn ghost';
    del.textContent = 'Remove';
    del.onclick = () => wrap.remove();

    wrap.append(input, del);
    return wrap;
  }

  function collectTextList(container) {
    return [...container.querySelectorAll('input[type="text"]')]
      .map(i => i.value.trim())
      .filter(Boolean);
  }

  function addDefaultLines(projectsList) {
    projectsList.appendChild(makeItemRow('Project Name'));
    ['concerns', 'risks', 'issues'].forEach(id => {
      document.getElementById(id).appendChild(makeItemRow('Add item'));
    });
  }

  /* -------------------- main init -------------------- */
  async function init() {
    // 1) guard ก่อนทำงานทั้งหมด
    const allowed = await guardOpenOrRedirect();
    if (!allowed) return;

    // 2) element refs
    const form         = $('#report-form');
    const msg          = $('#msg');
    const projectsList = $('#projects');

    const addProjectBtn  = $('#add-project');
    const addLineButtons = document.querySelectorAll('.add-line[data-target]');

    // 3) set labels จาก config
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

    // 4) wiring ปุ่มเพิ่ม/ลบแถว
    addProjectBtn.onclick = () => projectsList.appendChild(makeItemRow('Project Name'));
    addLineButtons.forEach(btn => {
      btn.onclick = () => document.getElementById(btn.dataset.target)
        .appendChild(makeItemRow('Add item'));
    });

    // แถวเริ่มต้น
    addDefaultLines(projectsList);

    // 5) handle submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      msg.textContent = 'Submitting...';

      try {
        // เก็บข้อมูล
        const data = new FormData(form);
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
            other:               form.querySelector('input[name="support_other"]').checked
          },
          recaptchaToken: await getRecaptchaToken()
        };

        // ส่งแบบ simple request (ไม่มี headers) เพื่อเลี่ยง CORS
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
        ['concerns','risks','issues'].forEach(id => document.getElementById(id).innerHTML = '');
        addDefaultLines(projectsList);
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
