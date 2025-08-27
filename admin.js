(() => {
  const $  = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const fmtMonth = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

  let idToken = null;
  const fp = {}; // flatpickr instances

  // --- mini notifier (ใช้แสดงสถานะมุมขวา) ---
  function note(msg, isErr=false){
    const el = $('#signin'); if(!el) return;
    el.textContent = msg;
    el.style.color = isErr ? '#dc2626' : '#667085';
  }

  // --- API helper ---
  async function api(op, payload = {}) {
    if (!window.CONFIG || !CONFIG.API_URL) throw new Error('API_URL ยังไม่ถูกตั้งค่า');
    const body = { op, payload };
    if (idToken) body.idToken = idToken;
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(()=>({ok:false,error:'Invalid JSON'}));
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  }

  // --- Calendar init (Flatpickr) ---
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
      if(fp[id]?.destroy) fp[id].destroy();
      fp[id] = flatpickr(el, opts);
    });
  }

  // --- UI helpers ---
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

  // --- Loads ---
  async function loadStatus(){
    const s = await api('getFormStatus', {});
    setBadge(s.open);
    setForceModeUI(s.mode || 'AUTO');
    $('#schedMode')        && ($('#schedMode').textContent = s.schedule?.mode || 'OFF');
    $('#schedWindow')      && ($('#schedWindow').textContent = s.schedule?.enabled ? `${s.schedule.windowStart} → ${s.schedule.windowEnd}` : 'OFF');
    $('#manualWindowView') && ($('#manualWindowView').textContent = (s.manualWindow?.start||s.manualWindow?.end) ? `${s.manualWindow.start||'—'} → ${s.manualWindow.end||'—'}` : '—');
    $('#modeView')         && ($('#modeView').textContent = s.mode || 'AUTO');
    $('#tzView')           && ($('#tzView').textContent   = s.tz || '—');

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

  // --- GIS boot (ต้อง sign in ก่อนโชว์ UI) ---
  function initGIS(){
    if (!window.google?.accounts?.id){
      // ถ้าสคริปต์ GIS ยังไม่มา ลองรอหน่อย
      let n=0; const t=setInterval(()=>{
        if (window.google?.accounts?.id){ clearInterval(t); initGIS(); }
        else if(++n>40){ note('โหลด Google Sign-In ไม่สำเร็จ', true); }
      },100);
      return;
    }
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
      },
      auto_select: false
    });
    // ปุ่มกด Sign in
    google.accounts.id.renderButton($('#signin'), { theme:'outline', size:'large', shape:'pill', width: 260 });
    // one-tap (เปิดถ้าต้องการ)
    // google.accounts.id.prompt();
  }

  // --- Boot ---
  window.addEventListener('load', () => {
    if (!window.CONFIG){ note('ยังไม่มี config.js', true); return; }
    if (CONFIG.DISABLE_SIGNIN){ // เผื่อเปิด dev โหมด (ไม่ใช้จริงในการโปรดักชัน)
      $('#admin-ui').style.display = 'block';
      refreshAll().catch(e=>note(e.message,true));
      note('DEV MODE (Sign-In disabled)');
    } else {
      initGIS();
    }
  });

  // --- Events ---
  $('#btn-refresh')?.addEventListener('click', refreshAll);

  $('#toggleForce')?.addEventListener('change', async (e) => {
    const checked = e.target.checked;
    const month = $('#monthPicker')?.value || fmtMonth();
    try{
      if(!checked){
        const d = await api('dashboard', { month });
        if ((d.submissions||0) > 0) {
          const ok = confirm(`มีข้อมูล ${d.submissions} รายการในเดือน ${month}. ต้องการปิดฟอร์มใช่ไหม?`);
          if(!ok){ e.target.checked = true; return; }
        }
      }
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

  $('#btn-dryrun')?.addEventListener('click', async () => {
    try{
      const from = $('#fromMonth')?.value, to = $('#toMonth')?.value, mode = $('#rollMode')?.value;
      if(!from || !to) throw new Error('เลือก From/To month');
      const r = await api('rollover', { from, to, mode, dryRun: true });
      $('#rollMsg').textContent = `Dry-run: ${r.count || 0} rows would be moved/copied.`;
    }catch(e){ alert(e.message); }
  });

  $('#btn-roll')?.addEventListener('click', async () => {
    try{
      const from = $('#fromMonth')?.value, to = $('#toMonth')?.value, mode = $('#rollMode')?.value;
      if(!from || !to) throw new Error('เลือก From/To month');
      const ok = confirm(`Rollover ${mode.toUpperCase()} from ${from} → ${to} ?`);
      if(!ok) return;
      const r = await api('rollover', { from, to, mode, dryRun: false });
      $('#rollMsg').textContent = `Done: moved/copied ${r.moved || 0} rows.`;
    }catch(e){ alert(e.message); }
  });
})();
