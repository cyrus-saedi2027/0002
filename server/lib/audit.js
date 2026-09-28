/* ==========================================================================
   گزارش کارها: چه کسی، کی، چه چیزی را در پنل عوض کرد (فایل audit.jsonl، هر خط یک رویداد).
   رمز، کد تأیید و متن کامل پیامک هیچ‌وقت این‌جا نوشته نمی‌شود.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

class Audit {
  constructor(dir) {
    this.file = path.join(dir, 'audit.jsonl');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.chain = Promise.resolve();
  }
  add(by, action, target = '', detail = '') {
    const line = JSON.stringify({ at: new Date().toISOString(), by: by ? { id: by.id, name: by.name } : null, action, target: String(target), detail: String(detail).slice(0, 200) }) + '\n';
    this.chain = this.chain.then(() => new Promise((res) => fs.appendFile(this.file, line, { mode: 0o600 }, () => res())));
    return this.chain;
  }
  /* تازه‌ترین رویدادها اول؛ فقط انتهای فایل خوانده می‌شود */
  async recent(limit = 300) {
    await this.chain;
    let buf;
    try {
      const st = fs.statSync(this.file);
      const len = Math.min(st.size, 512 * 1024);
      const fd = fs.openSync(this.file, 'r');
      buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, st.size - len);
      fs.closeSync(fd);
    } catch (e) { return []; }
    const lines = buf.toString('utf8').split('\n').filter(Boolean);
    const out = [];
    for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
      try { out.push(JSON.parse(lines[i])); } catch (e) { /* خط ناقص ابتدای برش */ }
    }
    return out;
  }
}

module.exports = { Audit };
