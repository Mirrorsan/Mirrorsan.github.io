// ต้องมี CONFIG.API_URL ใน config.js ชี้ไปยัง Apps Script web app
(async function gate() {
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body : JSON.stringify({ op: 'publicFormStatus' })
    });
    const json = await res.json();
    const open = !!(json && json.ok && json.data && json.data.open);

    if (!open) {
      // ปิดฟอร์ม: ไปหน้าแจ้งปิด
      location.replace('formclose.html');
      return;
    }
  } catch (err) {
    // ถ้าเช็คไม่ได้ เพื่อความปลอดภัย treat as closed
    location.replace('formclose.html');
    return;
  } finally {
    // ผ่านการเช็คแล้ว -> ให้ main.js รันต่อ
    document.documentElement.removeAttribute('data-gate');
  }
})();
