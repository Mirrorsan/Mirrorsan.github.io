(() => {
  const $  = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const fmtMonth = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

  let idToken = null;
  const fp = {};

  function note(msg, isErr=false){
    const el = $('#signin'); if(!el) return;
    el.textContent = msg;
    el.style.color = isErr ? '#dc2626' : '#667085';
  }

  async function api(op, payload = {}) {
    if (!window.CONFIG || !CONFIG.API_URL) throw new Error('API_URL ยังไม่ถูกตั้งค่า');
    const body = { op, payload };
    if (idToken) body.idToken = idToken;
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      mode: 'cors',
      redirect: 'follow'
    });
    let json; try { json = await res.json(); } catch { throw new Error(`Unexpected response (${res.status})`); }
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  }

  function initDatePickers(){
    if(!window.flatpickr) return;
    const ids = ['manualStart','manualEnd','rangeFrom','rangeTo','exportFrom','exportTo'];
    const opts = {
      locale: (flatpickr.l10ns && flatpickr.l10ns.th) ? flatpickr.l10ns.th : 'default',
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      allowInput: true
    };
    ids.forEach(id=>{
      const el = $('#'+id); if(!el) return;
      if (fp[id]?.destroy) fp[id].destroy();
      fp[id] = flatpickr(el, opts);
    });
  }

  function setBadge(open){
    const el = $('#formStatusBadge'); if(!el) return;
    el.textContent = open ? 'OPEN' : 'CLOSED';
    el.className = 'badge ' + (open ? 'open' : 'closed');
  }
  function setForceModeUI(mode){
    const t = $('#toggleForce'), l = $('#forceLabel');
    if(!t || !l) return;
    if(mode==='FORCE_OPEN'){ t.indeterminate=false; t.checked=true;  l.textContent='FORCE_OPEN'; }
    else if(mode==='FORCE_CLOSED'){ t.indeterminate=false; t.checked=false; l.textContent='FORCE_CLOSED'; }
    else { t.indeterminate=true; l.textContent='AUTO'; }
  }

  // ---- CUSTOM schedule UI toggle (show/hide + enable/disable) ----
  function syncCustomVisibility(mode) {
    const wrap = $('#schedCustomWrap');
    const s = $('#schedStartDay'), e = $('#schedEndDay');
    const on = (mode === 'CUSTOM');
    if (!wrap) return;

    // support both inline style and optional .hidden class
    if (on) {
      wrap.classList?.remove('hidden');
      wrap.style.display = 'flex';
    } else {
      wrap.classList?.add('hidden');
      wrap.style.display = 'none';
    }
    if (s) s.disabled = !on;
    if (e) e.disabled = !on;
  }

  // Load status → fill UI
  async function loadStatus(){
    const s = await api('getFormStatus', {});
    setBadge(s.open);
    setForceModeUI(s.mode || 'AUTO');

    $('#schedMode')        && ($('#schedMode').textContent = s.schedule?.mode || 'OFF');
    const winText = s.schedule?.enabled ? `${s.schedule.windowStart} → ${s.schedule.windowEnd}` : 'OFF';
    $('#schedWindow')      && ($('#schedWindow').textContent = winText);
    $('#manualWindowView') && ($('#manualWindowView').textContent =
      (s.manualWindow?.start||s.manualWindow?.end) ? `${s.manualWindow.start||'—'} → ${s.manualWindow.end||'—'}` : '—');
    $('#modeView')         && ($('#modeView').textContent = s.mode || 'AUTO');
    $('#tzView')           && ($('#tzView').textContent   = s.tz || '—');

    // schedule controls
    const modeSel = $('#schedModeSel');
    if (modeSel) {
      const mode = s.schedule?.mode || 'OFF';
      modeSel.value = mode;
      syncCustomVisibility(mode);
    }
    if (s.schedule?.mode === 'CUSTOM') {
      if ($('#schedStartDay')) $('#schedStartDay').value = s.schedule.startDay ?? '';
      if ($('#schedEndDay'))   $('#schedEndDay').value   = s.schedule.endDay ?? '';
    } else {
      if ($('#schedStartDay')) $('#schedStartDay').value = '';
      if ($('#schedEndDay'))   $('#schedEndDay').value   = '';
    }

    const activeBadge = $('#schedActiveBadge');
    if (activeBadge) {
      const active = !!s.schedule?.active;
      activeBadge.textContent = active ? 'ACTIVE' : 'INACTIVE';
      activeBadge.className = 'badge ' + (active ? 'open' : 'closed');
    }

    // manual picker fill
    if (s.manualWindow?.start && fp.manualStart) fp.manualStart.setDate(s.manualWindow.start, true, 'Y-m-d');
    if (s.manualWindow?.end   && fp.manualEnd)   fp.manualEnd.setDate(s.manualWindow.end,   true, 'Y-m-d');
  }

  async function loadDashboardMonth(){
    const month = $('#monthPicker')?.value || fmtMonth();
    const d = await api('dashboard', { month });
    const el = $('#dashMonth'); if(!el) return;
    const byDay = (d.byDate||[]).map(x=>`<tr><td>${x.date}</td><td>${x.count}</td></tr>`).join('');
    el.innerHTML = `
      <div class="kpi">
        <div class="pill">Month: <b>${month}</b></div>
        <div class="pill">Submissions: <b>${d.submissions||0}</b></div>
        <div class="pill">Last: <b>${d.lastSubmittedAt||'-'}</b></div>
      </div>
      <table>
        <thead><tr><th>วันที่</th><th>จำนวน</th></tr></thead>
        <tbody>${byDay}</tbody>
      </table>
      <div class="mt small muted">ล่าสุด 5 รายการ</div>
      <table class="mt">
        <thead><tr><th>Submitted At</th><th>Name</th></tr></thead>
        <tbody>${(d.latest5||[]).map(r=>`<tr><td>${r.submittedAt}</td><td>${(r.firstName||'')+' '+(r.lastName||'')}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  async function loadDashboardRange(){
    const from = $('#rangeFrom')?.value;
    const to   = $('#rangeTo')?.value;
    if(!from || !to){ ($('#dashRange')||{}).innerHTML = '<span class="small muted">เลือกวันที่ก่อน</span>'; return; }
    const d = await api('dashboardRange', { from, to });
    const el = $('#dashRange'); if(!el) return;
    const rows = (d.byDate||[]).map(x=>`<tr><td>${x.date}</td><td>${x.count}</td></tr>`).join('');
    el.innerHTML = `
      <div class="kpi">
        <div class="pill">Range: <b>${from}</b> → <b>${to}</b></div>
        <div class="pill">Submissions: <b>${d.submissions||0}</b></div>
        <div class="pill">Last: <b>${d.lastSubmittedAt||'-'}</b></div>
      </div>
      <table><thead><tr><th>วันที่</th><th>จำนวน</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function refreshAll(){
    const m = fmtMonth();
    if ($('#monthPicker') && !$('#monthPicker').value) $('#monthPicker').value = m;
    if ($('#exportMonth') && !$('#exportMonth').value) $('#exportMonth').value = m;

    initDatePickers();
    await loadStatus();
    await loadDashboardMonth();
  }

  async function waitForConfig(timeoutMs = 4000, step = 50) {
    if (window.CONFIG) return true;
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      await new Promise(r => setTimeout(r, step));
      if (window.CONFIG) return true;
    }
    return false;
  }

  function initGIS(){
    let tries = 0;
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        google.accounts.id.initialize({
          client_id: CONFIG.OAUTH_CLIENT_ID,
          callback: async (resp) => {
            try{
              idToken = resp.credential;
              $('#admin-ui').style.display = 'block';
              note('กำลังโหลดข้อมูล…');
              await refreshAll();
              note('ลงชื่อเข้าใช้แล้ว');
            }catch(e){ note(e.message, true); }
          }
        });
        google.accounts.id.renderButton($('#signin'), { theme:'outline', size:'large', shape:'pill', width: 260 });
      } else if (++tries > 50) {
        clearInterval(timer);
        $('#admin-ui').style.display = 'block';
        note('โหลด Google Sign-In ไม่สำเร็จ → เปิดโหมดชั่วคราว (DEV)', true);
        refreshAll().catch(e => note(e.message, true));
      }
    }, 100);
  }

  window.addEventListener('load', async () => {
    const ok = await waitForConfig(4000);
    if (!ok) { note('ไม่พบ config.js หรือโหลดไม่สำเร็จ', true); return; }

    // make sure CUSTOM block is in correct state even before status loads
    syncCustomVisibility($('#schedModeSel')?.value || 'OFF');

    if (CONFIG.DISABLE_SIGNIN){
      $('#admin-ui').style.display = 'block';
      refreshAll().catch(e=>note(e.message,true));
      note('DEV MODE (Sign-In disabled)');
    } else {
      initGIS();
    }
  });

  // Events
  $('#btn-refresh')?.addEventListener('click', refreshAll);

  $('#toggleForce')?.addEventListener('change', async (e) => {
    const checked = e.target.checked;
    try{
      const mode = checked ? 'FORCE_OPEN' : 'FORCE_CLOSED';
      await api('setFormMode', { mode });
      await loadStatus();
      note(`ตั้งค่า ${mode} แล้ว`);
    }catch(err){
      e.target.checked = !checked;
      note(`ไม่สามารถเปลี่ยนโหมด: ${err.message}`, true);
    }
  });

  $('#btn-reset-auto')?.addEventListener('click', async () => {
    try{
      note('กำลังตั้งค่าเป็น AUTO…');
      await api('setFormMode', { mode: 'AUTO' });
      await loadStatus();
      note('ตั้งค่าเป็น AUTO แล้ว');
    }catch(e){ note(`ตั้งค่าไม่สำเร็จ: ${e.message}`, true); }
  });

  $('#btn-save-manual-window')?.addEventListener('click', async () => {
    const start = $('#manualStart')?.value || null;
    const end   = $('#manualEnd')?.value || null;
    if(!start && !end){ alert('กรุณาเลือกอย่างน้อย 1 ช่อง'); return; }
    await api('setManualWindow', { startDate:start, endDate:end });
    await loadStatus();
  });

  $('#btn-clear-manual-window')?.addEventListener('click', async () => {
    await api('setManualWindow', { startDate:null, endDate:null });
    if (fp.manualStart) fp.manualStart.clear();
    if (fp.manualEnd)   fp.manualEnd.clear();
    await loadStatus();
  });

  // Schedule mode UI
  $('#schedModeSel')?.addEventListener('change', (e) => {
    const mode = e.target.value;
    syncCustomVisibility(mode);

    // convenience: set defaults when switching to CUSTOM first time
    const sEl = $('#schedStartDay'), eEl = $('#schedEndDay');
    if (mode === 'CUSTOM') {
      if (sEl && !sEl.value) sEl.value = '16';
      if (eEl && !eEl.value) eEl.value = '15';
    } else {
      if (sEl) sEl.value = '';
      if (eEl) eEl.value = '';
    }
  });

  $('#btn-save-schedule')?.addEventListener('click', async () => {
    const mode = $('#schedModeSel')?.value || 'OFF';
    try{
      if (mode === 'CUSTOM') {
        const s = Number($('#schedStartDay')?.value || '');
        const e = Number($('#schedEndDay')?.value || '');
        if (!Number.isInteger(s) || !Number.isInteger(e)) { alert('กรุณากรอก Start/End day เป็นตัวเลข 1–31'); return; }
        if (s < 1 || s > 31 || e < 1 || e > 31) { alert('Start/End day ต้องอยู่ในช่วง 1–31'); return; }
        await api('setScheduleMode', { mode, startDay: s, endDay: e });
      } else {
        await api('setScheduleMode', { mode });
      }
      await loadStatus();
      note('บันทึก Schedule แล้ว');
    }catch(err){
      note(`บันทึก Schedule ไม่สำเร็จ: ${err.message}`, true);
    }
  });

  $('#btn-range-stats')?.addEventListener('click', loadDashboardRange);

  $('#btn-export-specific')?.addEventListener('click', async () => {
    const month = $('#exportMonth')?.value || fmtMonth();
    try{
      const r = await api('exportXlsxIfExists', { month });
      $('#exportMsg').innerHTML = `Exported: <a href="${r.downloadUrl}" target="_blank" rel="noopener">Download .xlsx</a>`;
    }catch(e){ $('#exportMsg').textContent = `ไม่สามารถ Export เดือน ${month}: ${e.message}`; }
  });

  $('#btn-export-current')?.addEventListener('click', async () => {
    try{
      const r = await api('exportXlsxCurrent', {});
      window.open(r.downloadUrl, '_blank');
    }catch(e){ alert(e.message); }
  });

  $('#btn-export-range')?.addEventListener('click', async () => {
    const from = $('#exportFrom')?.value;
    const to   = $('#exportTo')?.value;
    if(!from || !to){ alert('กรุณาเลือกช่วงวันที่ให้ครบ'); return; }
    try{
      const r = await api('exportXlsxByRange', { from, to });
      $('#exportMsgRange').innerHTML = `Exported: <a href="${r.downloadUrl}" target="_blank" rel="noopener">Download .xlsx</a>`;
    }catch(e){ $('#exportMsgRange').textContent = `Export ไม่สำเร็จ: ${e.message}`; }
  });

  // (rollover handlers unchanged)
})();
