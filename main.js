(function () {
  const cfg = window.APP_CONFIG;

  // -------- 1) เช็คสถานะฟอร์มก่อนเริ่ม init ทั้งหมด --------
async function fetchFormStatus() {
  const ops = ['getPublicFormStatus', 'publicFormStatus', 'formStatus'];
  for (const op of ops) {
    try {
      const res = await fetch(cfg.API_ENDPOINT, {
        method: 'POST',
        // ❌ อย่าใส่ headers เพื่อเลี่ยง preflight
        body: JSON.stringify({ op })
      });

      const text = await res.text();
      let json; try { json = JSON.parse(text); } catch { json = null; }
      if (json && json.ok && json.data && typeof json.data.open === 'boolean') {
        return json.data; // { open, mode, schedule, manualWindow, checks, ... }
      }
    } catch (_) {
      // ลอง op ถัดไป
    }
  }
  // ถ้าเรียกไม่ได้เลย ให้ถือว่าปิดเพื่อความปลอดภัย
  return { open: false, reason: 'status_unreachable' };
}


  async function guardOpenOrRedirect() {
    const status = await fetchFormStatus();

    // ✅ เปิดฟอร์ม
    if (status.open === true) return true;

    // 🔒 ปิดฟอร์ม → redirect
    try {
      window.location.replace('formclose.html');
    } catch {
      window.location.href = 'formclose.html';
    }
    return false;
  }

  // -------- 2) ทำงานจริงหลังผ่านการตรวจสถานะ --------
  async function init() {
    const allowed = await guardOpenOrRedirect();
    if (!allowed) return; // หยุดทุกอย่างถ้าปิด

    // ---- จากตรงนี้ไปคือโค้ดเดิมของคุณ (init ฟอร์ม) ----
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

    // Helpers
    function makeItemRow(placeholder = 'Type here...') {
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
      ['concerns', 'risks', 'issues'].forEach(id => {
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

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      msg.textContent = 'Submitting...';

      try {
        const data = new FormData(form);
        const projects = [...projectsList.querySelectorAll('input[type=text]')]
          .map(i => i.value.trim()).filter(Boolean);

        const concerns = [...document.querySelectorAll('#concerns input')].map(i => i.value.trim()).filter(Boolean);
        const risks = [...document.querySelectorAll('#risks input')].map(i => i.value.trim()).filter(Boolean);
        const issues = [...document.querySelectorAll('#issues input')].map(i => i.value.trim()).filter(Boolean);
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
        payload.recaptchaToken = token || '';

        const res = await fetch(cfg.API_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify({ op: 'submit', payload })
        });

        const text = await res.text();
        let json;
        try { json = JSON.parse(text); }
        catch { throw new Error('Invalid server response'); }

        if (!json.ok) throw new Error(json.error || 'Submit failed');

        msg.textContent = '✅ Submitted! Thank you.';
        form.reset();
        projectsList.innerHTML = '';
        ['concerns','risks','issues'].forEach(id => document.getElementById(id).innerHTML = '');
        addDefaultLines();
      } catch (err) {
        console.error(err);
        msg.textContent = `❌ ${err.message}`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  }

  // เริ่มทำงาน
  init();
})();
