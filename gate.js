// gate.js
(function gate() {
  const cfg = window.APP_CONFIG || window.CONFIG || {};

  const parseJSON = (t) => { try { return JSON.parse(t); } catch { return null; } };

  // GET สถานะ (ไม่มี preflight)
  async function getStatusViaGET() {
    const u = (cfg.STATUS_ENDPOINT || cfg.API_URL_STATUS) +
              (/\?/.test(cfg.STATUS_ENDPOINT || cfg.API_URL_STATUS) ? '&' : '?') +
              `_=${Date.now()}`; // กัน cache
    const res = await fetch(u, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow'
    });
    const text = await res.text();
    return parseJSON(text);
  }

  // POST สถานะ (fallback)
  async function getStatusViaPOST(op) {
    const url = cfg.API_ENDPOINT || cfg.API_URL;
    const res = await fetch(url, {
      method: 'POST',
      // ❗️อย่าใส่ header แปลก ๆ นอกจาก JSON ตรงนี้
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op }),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow'
    });
    const text = await res.text();
    return parseJSON(text);
  }

  (async () => {
    let json = null;

    // 1) ลอง GET ก่อน
    try { json = await getStatusViaGET(); } catch {}

    // 2) ถ้ายังไม่ได้ ลอง POST op=formStatus
    if (!(json && json.ok)) {
      try { json = await getStatusViaPOST('formStatus'); } catch {}
    }

    // 3) เผื่อฝั่ง server เปิดชื่อ op อื่น
    if (!(json && json.ok)) {
      try { json = await getStatusViaPOST('publicFormStatus'); } catch {}
    }
    if (!(json && json.ok)) {
      try { json = await getStatusViaPOST('getPublicFormStatus'); } catch {}
    }

    const open = !!(json && json.ok && json.data && json.data.open === true);

    if (open) {
      // ✅ เปิดฟอร์ม: ปลด gate ให้ main.js ทำงานต่อ
      document.documentElement.removeAttribute('data-gate');
    } else {
      // 🔒 ปิดฟอร์ม หรือเช็คไม่สำเร็จ: redirect
      location.replace('formclose.html');
    }
  })();
})();
