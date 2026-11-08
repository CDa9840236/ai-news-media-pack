#!/usr/bin/env node
// AI News Media Pack generator.
// Usage: node build.js editions/2026-11-08.json
// Output: out/<date>/ with carousel, story, and landscape PNGs, captions.md, and a zip.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const editionPath = process.argv[2];
if (!editionPath) { console.error('Usage: node build.js <edition.json>'); process.exit(1); }
const ed = JSON.parse(fs.readFileSync(editionPath, 'utf8'));
const outDir = path.join(__dirname, 'out', ed.date);
fs.rmSync(outDir, { recursive: true, force: true });
for (const d of ['carousel', 'stories', 'landscape']) fs.mkdirSync(path.join(outDir, d), { recursive: true });

const CAT = {
  Policy:         '#7C9CFF',
  Funding:        '#4BE3A0',
  Enterprise:     '#FFB547',
  Infrastructure: '#FF6B8B',
  Product:        '#C38BFF',
  Research:       '#4FD5F2',
};
const accentOf = (c) => CAT[c] || '#4FD5F2';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = ed.stories.length;
const prettyDate = new Date(ed.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const baseCSS = (w, h) => `
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px;overflow:hidden}
  body{background:#0A0E1A;color:#F2F4F8;font-family:'Inter',sans-serif;position:relative;-webkit-font-smoothing:antialiased}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:54px 54px}
  .glow{position:absolute;border-radius:50%;filter:blur(120px);opacity:.38}
  .mono{font-family:'JetBrains Mono',monospace}
  .display{font-family:'Inter Display','Inter',sans-serif}
  .brand{display:flex;align-items:center;gap:14px;font-weight:700;letter-spacing:-.01em}
  .dot{width:16px;height:16px;border-radius:50%;background:#4FD5F2;box-shadow:0 0 24px #4FD5F2}
  .tag{display:inline-block;padding:10px 20px;border-radius:999px;font-family:'JetBrains Mono',monospace;font-weight:600;text-transform:uppercase;letter-spacing:.12em}
  .muted{color:#9AA3B8}
`;

function page(w, h, inner, glowColor) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCSS(w, h)}</style></head><body>
  <div class="grid"></div>
  <div class="glow" style="width:${w * 0.9}px;height:${w * 0.9}px;background:${glowColor};right:-${w * 0.35}px;top:-${w * 0.3}px"></div>
  <div class="glow" style="width:${w * 0.6}px;height:${w * 0.6}px;background:#3B4BFF;left:-${w * 0.3}px;bottom:-${w * 0.25}px;opacity:.25"></div>
  ${inner}</body></html>`;
}

// ---------- Portrait templates (carousel 1080x1350, story 1080x1920) ----------
function coverPortrait(w, h) {
  const pad = 88;
  return page(w, h, `
  <div style="position:absolute;inset:${pad}px;display:flex;flex-direction:column">
    <div class="brand" style="font-size:34px"><span class="dot"></span>${esc(ed.brand)}</div>
    <div class="mono muted" style="font-size:24px;margin-top:14px;letter-spacing:.08em">ISSUE #${ed.issue} · ${esc(ed.week_label.toUpperCase())}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div class="display" style="font-size:${h > 1500 ? 132 : 112}px;font-weight:800;line-height:.98;letter-spacing:-.035em">${esc(ed.cover_title)}</div>
      <div style="margin-top:56px;display:flex;flex-direction:column;gap:18px">
        ${ed.stories.map((s, i) => `<div style="display:flex;align-items:center;gap:20px;font-size:30px">
          <span class="mono" style="color:${accentOf(s.category)};font-weight:700;width:52px">0${i + 1}</span>
          <span style="font-weight:500">${esc(s.headline)}</span></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:26px">
      <span class="muted">${esc(ed.handle)}</span>
      <span class="mono" style="color:#4FD5F2;font-weight:600">SWIPE →</span>
    </div>
  </div>`, '#4FD5F2');
}

function storyPortrait(s, i, w, h) {
  const a = accentOf(s.category);
  const pad = 88;
  const tall = h > 1500;
  return page(w, h, `
  <div style="position:absolute;inset:${pad}px;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="brand" style="font-size:28px"><span class="dot"></span>${esc(ed.brand)}</div>
      <div class="mono muted" style="font-size:24px">${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</div>
    </div>
    <div style="margin-top:${tall ? 120 : 64}px"><span class="tag" style="font-size:22px;color:${a};background:${a}1f;border:2px solid ${a}55">${esc(s.category)}</span></div>
    <div class="display" style="margin-top:36px;font-size:${(s.stat.length > 7 ? 0.72 : 1) * (tall ? 176 : 150)}px;font-weight:800;letter-spacing:-.04em;line-height:1;white-space:nowrap;color:${a}">${esc(s.stat)}</div>
    <div class="mono muted" style="font-size:24px;margin-top:12px;text-transform:uppercase;letter-spacing:.1em">${esc(s.stat_label)}</div>
    <div class="display" style="margin-top:${tall ? 72 : 48}px;font-size:${tall ? 80 : 70}px;font-weight:750;line-height:1.04;letter-spacing:-.03em">${esc(s.headline)}</div>
    <div style="margin-top:32px;font-size:${tall ? 36 : 31}px;line-height:1.42;color:#C9D0DE">${esc(s.summary)}</div>
    <div style="flex:1"></div>
    <div style="border-left:6px solid ${a};padding:8px 0 8px 28px;margin-bottom:${tall ? 80 : 44}px">
      <div class="mono" style="font-size:20px;color:${a};letter-spacing:.14em;font-weight:600">WHY IT MATTERS</div>
      <div style="font-size:${tall ? 38 : 32}px;font-weight:600;margin-top:10px;line-height:1.3">${esc(s.why)}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:22px" class="muted">
      <span>Source: ${esc(s.sources.join(', '))}</span><span>${esc(prettyDate)}</span>
    </div>
  </div>`, a);
}

function outroPortrait(w, h) {
  const pad = 88;
  return page(w, h, `
  <div style="position:absolute;inset:${pad}px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start">
    <div class="brand" style="font-size:34px"><span class="dot"></span>${esc(ed.brand)}</div>
    <div class="display" style="margin-top:48px;font-size:104px;font-weight:800;line-height:1;letter-spacing:-.035em">Get the AI news that matters, every week.</div>
    <div style="margin-top:40px;font-size:36px;color:#C9D0DE;line-height:1.4">Follow <b style="color:#4FD5F2">${esc(ed.handle)}</b> and save this post for later.</div>
    <div style="margin-top:64px;display:flex;gap:18px">
      ${['Follow', 'Save', 'Share'].map((t) => `<span class="tag" style="font-size:24px;color:#0A0E1A;background:#4FD5F2">${t}</span>`).join('')}
    </div>
  </div>`, '#4FD5F2');
}

// ---------- Landscape template (1200x675 for X / LinkedIn / blog) ----------
function storyLandscape(s, i) {
  const w = 1200, h = 675, a = accentOf(s.category);
  return page(w, h, `
  <div style="position:absolute;inset:60px 64px;display:grid;grid-template-columns:1fr 330px;gap:48px">
    <div style="display:flex;flex-direction:column">
      <div class="brand" style="font-size:22px"><span class="dot" style="width:12px;height:12px"></span>${esc(ed.brand)} <span class="mono muted" style="font-weight:400;font-size:18px;margin-left:8px">#${ed.issue}</span></div>
      <div style="margin-top:34px"><span class="tag" style="font-size:16px;padding:8px 16px;color:${a};background:${a}1f;border:2px solid ${a}55">${esc(s.category)}</span></div>
      <div class="display" style="margin-top:22px;font-size:58px;font-weight:800;line-height:1.03;letter-spacing:-.03em">${esc(s.headline)}</div>
      <div style="margin-top:22px;font-size:22px;line-height:1.45;color:#C9D0DE">${esc(s.summary)}</div>
      <div style="flex:1"></div>
      <div class="muted" style="font-size:16px">Source: ${esc(s.sources.join(', '))} · ${esc(prettyDate)}</div>
    </div>
    <div style="display:flex;flex-direction:column;justify-content:center;border-left:2px solid rgba(255,255,255,.1);padding-left:40px">
      <div class="display" style="font-size:${s.stat.length > 7 ? 64 : 92}px;font-weight:800;color:${a};letter-spacing:-.04em;line-height:1">${esc(s.stat)}</div>
      <div class="mono muted" style="font-size:16px;margin-top:12px;text-transform:uppercase;letter-spacing:.1em">${esc(s.stat_label)}</div>
      <div style="margin-top:40px;font-size:20px;font-weight:600;line-height:1.35">${esc(s.why)}</div>
    </div>
  </div>`, a);
}

// ---------- Captions ----------
function captions() {
  const tags = '#AI #ArtificialIntelligence #AINews #Tech #FutureOfWork';
  const list = ed.stories.map((s, i) => `${i + 1}. ${s.headline}`).join('\n');
  let md = `# ${ed.brand}: Issue #${ed.issue} (${ed.week_label})\n\n`;
  md += `## Instagram / LinkedIn carousel caption\n\n${ed.cover_title} 👇\n\n${list}\n\nSwipe for the details, and follow ${ed.handle} for a new brief every week.\n\n${tags}\n\n`;
  md += `## X / Threads thread\n\n**1/** ${ed.cover_title} 🧵\n\n`;
  ed.stories.forEach((s, i) => { md += `**${i + 2}/** ${s.headline}. ${s.summary} ${s.why}\n\n`; });
  md += `**${n + 2}/** That's the week. Follow ${ed.handle} for next week's brief.\n\n`;
  md += `## Per-story captions (for the landscape and story images)\n\n`;
  ed.stories.forEach((s, i) => { md += `**${String(i + 1).padStart(2, '0')}: ${s.category}.** ${s.headline}. ${s.why} ${tags}\n\n`; });
  md += `## Sources (check them before you post)\n\n`;
  ed.stories.forEach((s, i) => { md += `${i + 1}. ${s.headline}\n${s.urls.map((u) => `   - ${u}`).join('\n')}\n`; });
  return md;
}

(async () => {
  const browser = await chromium.launch();
  const shoot = async (html, w, h, file) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(outDir, file) });
    await p.close();
  };
  // Carousel 1080x1350
  await shoot(coverPortrait(1080, 1350), 1080, 1350, 'carousel/00-cover.png');
  for (let i = 0; i < n; i++) await shoot(storyPortrait(ed.stories[i], i, 1080, 1350), 1080, 1350, `carousel/${String(i + 1).padStart(2, '0')}-${ed.stories[i].category.toLowerCase()}.png`);
  await shoot(outroPortrait(1080, 1350), 1080, 1350, `carousel/${String(n + 1).padStart(2, '0')}-follow.png`);
  // Stories / Reels / TikTok 1080x1920
  await shoot(coverPortrait(1080, 1920), 1080, 1920, 'stories/00-cover.png');
  for (let i = 0; i < n; i++) await shoot(storyPortrait(ed.stories[i], i, 1080, 1920), 1080, 1920, `stories/${String(i + 1).padStart(2, '0')}-${ed.stories[i].category.toLowerCase()}.png`);
  // Landscape 1200x675
  for (let i = 0; i < n; i++) await shoot(storyLandscape(ed.stories[i], i), 1200, 675, `landscape/${String(i + 1).padStart(2, '0')}-${ed.stories[i].category.toLowerCase()}.png`);
  await browser.close();

  fs.writeFileSync(path.join(outDir, 'captions.md'), captions());
  const zipName = `ai-brief-issue-${ed.issue}-${ed.date}.zip`;
  execSync(`cd "${outDir}" && zip -qr "../${zipName}" .`);
  console.log(`Built ${outDir} and out/${zipName}`);
})();
