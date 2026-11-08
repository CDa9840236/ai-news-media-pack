#!/usr/bin/env node
// AI News Brief media pack generator (Social Co-Lab brand).
// Usage: NODE_PATH=$(npm root -g) node build.js editions/2026-11-08.json
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

// ---------- Brand ----------
const C = {
  cream: '#F6EEE1',
  caramel: '#8A4F12',
  blush: '#E9B9B6',
  blushSoft: '#F4D9D5',
  black: '#1B1411',
  ink: '#3A2E28',
  muted: '#7D6B5E',
};
const GOLD = 'linear-gradient(115deg,#8C6420 0%,#C9993A 22%,#F3DC96 45%,#C9993A 62%,#E8C977 80%,#8C6420 100%)';
const GOLD_TEXT = 'linear-gradient(115deg,#7A5518 0%,#B8862B 30%,#D4AA52 50%,#B8862B 70%,#7A5518 100%)';
const dataUri = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'assets', f)).toString('base64');
const LOGO_FULL = dataUri('logo-full.png');
const LOGO_MARK = dataUri('logo-mark.png');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = ed.stories.length;
const pad2 = (i) => String(i).padStart(2, '0');
const prettyDate = new Date(ed.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const baseCSS = (w, h) => `
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px;overflow:hidden}
  body{background:${C.cream};color:${C.black};font-family:'Inter',sans-serif;position:relative;-webkit-font-smoothing:antialiased}
  .mono{font-family:'JetBrains Mono',monospace}
  .display{font-family:'Inter Display','Inter',sans-serif}
  .gold{background:${GOLD_TEXT};-webkit-background-clip:text;background-clip:text;color:transparent}
  .goldbar{background:${GOLD}}
  .tag{display:inline-block;border-radius:999px;font-family:'JetBrains Mono',monospace;font-weight:600;text-transform:uppercase;letter-spacing:.14em;background:${C.blushSoft};color:${C.caramel};border:2px solid ${C.blush}}
  .muted{color:${C.muted}}
  .blob{position:absolute;border-radius:50%;background:${C.blush};filter:blur(90px);opacity:.55}
`;

function page(w, h, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCSS(w, h)}</style></head><body>
  <div class="blob" style="width:${w * 0.75}px;height:${w * 0.75}px;right:-${w * 0.32}px;top:-${w * 0.3}px"></div>
  <div class="blob" style="width:${w * 0.5}px;height:${w * 0.5}px;left:-${w * 0.28}px;bottom:-${w * 0.22}px;opacity:.35"></div>
  <div class="goldbar" style="position:absolute;left:0;right:0;top:0;height:10px"></div>
  <div class="goldbar" style="position:absolute;left:0;right:0;bottom:0;height:10px"></div>
  ${inner}</body></html>`;
}

const brandRow = (size) => `<div style="display:flex;align-items:center;gap:${size * 0.5}px">
  <img src="${LOGO_MARK}" style="height:${size * 1.9}px">
  <div style="line-height:1.1">
    <div style="font-size:${size}px;font-weight:700;letter-spacing:-.01em">${esc(ed.brand)}</div>
    <div style="font-size:${size * 0.66}px;font-weight:400;color:${C.caramel};letter-spacing:.02em">by ${esc(ed.org)}</div>
  </div></div>`;

// ---------- Portrait templates (carousel 1080x1350, story 1080x1920) ----------
function coverPortrait(w, h) {
  const tall = h > 1500;
  return page(w, h, `
  <div style="position:absolute;inset:88px;display:flex;flex-direction:column">
    ${brandRow(30)}
    <div class="mono" style="font-size:22px;margin-top:28px;letter-spacing:.12em;color:${C.caramel};font-weight:600">ISSUE #${ed.issue} · ${esc(ed.week_label.toUpperCase())}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div class="display" style="font-size:${tall ? 128 : 108}px;font-weight:800;line-height:.98;letter-spacing:-.035em">${esc(ed.cover_title_pre)} <span class="gold">${esc(ed.cover_title_gold)}</span></div>
      <div class="goldbar" style="width:140px;height:6px;border-radius:3px;margin-top:44px"></div>
      <div style="margin-top:40px;display:flex;flex-direction:column;gap:20px">
        ${ed.stories.map((s, i) => `<div style="display:flex;align-items:baseline;gap:20px;font-size:30px">
          <span class="mono" style="color:${C.caramel};font-weight:700;width:52px">${pad2(i + 1)}</span>
          <span style="font-weight:500;color:${C.ink}">${esc(s.headline)}</span></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:26px">
      <span class="muted">${esc(ed.handle)}</span>
      <span class="mono" style="color:${C.caramel};font-weight:700">SWIPE →</span>
    </div>
  </div>`);
}

function storyPortrait(s, i, w, h) {
  const tall = h > 1500;
  const statSize = (s.stat.length > 7 ? 0.72 : 1) * (tall ? 176 : 150);
  return page(w, h, `
  <div style="position:absolute;inset:88px;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center">
      ${brandRow(26)}
      <div class="mono muted" style="font-size:24px">${pad2(i + 1)} / ${pad2(n)}</div>
    </div>
    ${tall ? '<div style="flex:1"></div>' : ''}
    <div style="margin-top:${tall ? 0 : 60}px"><span class="tag" style="font-size:22px;padding:10px 22px">${esc(s.category)}</span></div>
    <div class="display" style="margin-top:34px;font-size:${statSize}px;font-weight:800;letter-spacing:-.04em;line-height:1;white-space:nowrap;color:${C.caramel}">${esc(s.stat)}</div>
    <div class="mono muted" style="font-size:24px;margin-top:14px;text-transform:uppercase;letter-spacing:.1em">${esc(s.stat_label)}</div>
    <div class="display" style="margin-top:${tall ? 72 : 46}px;font-size:${tall ? 80 : 68}px;font-weight:750;line-height:1.04;letter-spacing:-.03em">${esc(s.headline)}</div>
    <div style="margin-top:30px;font-size:${tall ? 36 : 31}px;line-height:1.42;color:${C.ink}">${esc(s.summary)}</div>
    <div style="flex:1"></div>
    ${tall ? '<div style="height:72px"></div>' : ''}
    <div style="display:flex;gap:28px;margin-bottom:${tall ? 80 : 44}px;background:rgba(255,255,255,.55);border-radius:24px;padding:28px 32px">
      <div class="goldbar" style="width:6px;border-radius:3px;flex:none"></div>
      <div>
        <div class="mono" style="font-size:20px;color:${C.caramel};letter-spacing:.14em;font-weight:700">WHY IT MATTERS</div>
        <div style="font-size:${tall ? 38 : 31}px;font-weight:600;margin-top:10px;line-height:1.3">${esc(s.why)}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:22px" class="muted">
      <span>Source: ${esc(s.sources.join(', '))}</span><span>${esc(prettyDate)}</span>
    </div>
  </div>`);
}

function outroPortrait(w, h) {
  return page(w, h, `
  <div style="position:absolute;inset:88px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
    <img src="${LOGO_FULL}" style="width:${w * 0.46}px">
    <div class="goldbar" style="width:140px;height:6px;border-radius:3px;margin-top:64px"></div>
    <div class="display" style="margin-top:48px;font-size:82px;font-weight:800;line-height:1.02;letter-spacing:-.035em">The AI news that matters, <span class="gold">every week.</span></div>
    <div style="margin-top:36px;font-size:34px;color:${C.ink};line-height:1.4">Follow <b style="color:${C.caramel}">${esc(ed.handle)}</b> and save this post for later.</div>
    <div style="margin-top:56px;display:flex;gap:18px">
      ${['Follow', 'Save', 'Share'].map((t) => `<span class="tag" style="font-size:24px;padding:12px 26px;background:${C.black};color:${C.cream};border-color:${C.black}">${t}</span>`).join('')}
    </div>
  </div>`);
}

// ---------- Landscape template (1200x675 for X / LinkedIn / blog) ----------
function storyLandscape(s) {
  const w = 1200, h = 675;
  return page(w, h, `
  <div style="position:absolute;inset:56px 64px;display:grid;grid-template-columns:1fr 330px;gap:48px">
    <div style="display:flex;flex-direction:column">
      ${brandRow(20)}
      <div style="margin-top:30px"><span class="tag" style="font-size:16px;padding:8px 16px">${esc(s.category)}</span></div>
      <div class="display" style="margin-top:20px;font-size:56px;font-weight:800;line-height:1.03;letter-spacing:-.03em">${esc(s.headline)}</div>
      <div style="margin-top:20px;font-size:22px;line-height:1.45;color:${C.ink}">${esc(s.summary)}</div>
      <div style="flex:1"></div>
      <div class="muted" style="font-size:16px">Source: ${esc(s.sources.join(', '))} · ${esc(prettyDate)}</div>
    </div>
    <div style="display:flex;flex-direction:column;justify-content:center;padding-left:40px;position:relative">
      <div class="goldbar" style="position:absolute;left:0;top:20px;bottom:20px;width:3px;border-radius:2px"></div>
      <div class="display" style="font-size:${s.stat.length > 7 ? 64 : 92}px;font-weight:800;color:${C.caramel};letter-spacing:-.04em;line-height:1;white-space:nowrap">${esc(s.stat)}</div>
      <div class="mono muted" style="font-size:16px;margin-top:12px;text-transform:uppercase;letter-spacing:.1em">${esc(s.stat_label)}</div>
      <div style="margin-top:40px;font-size:20px;font-weight:600;line-height:1.35">${esc(s.why)}</div>
    </div>
  </div>`);
}

// ---------- Captions ----------
function captions() {
  const tags = '#AI #AINews #ArtificialIntelligence #SocialCoLab #Tech';
  const title = `${ed.cover_title_pre} ${ed.cover_title_gold}`;
  const list = ed.stories.map((s, i) => `${i + 1}. ${s.headline}`).join('\n');
  let md = `# ${ed.brand} by ${ed.org}: Issue #${ed.issue} (${ed.week_label})\n\n`;
  md += `## Instagram / LinkedIn carousel caption\n\n${title} 👇\n\n${list}\n\nSwipe for the details, and follow ${ed.handle} for a new brief every week.\n\n${tags}\n\n`;
  md += `## X / Threads thread\n\n**1/** ${title} 🧵\n\n`;
  ed.stories.forEach((s, i) => { md += `**${i + 2}/** ${s.headline}. ${s.summary} ${s.why}\n\n`; });
  md += `**${n + 2}/** That's the week. Follow ${ed.handle} for next week's brief.\n\n`;
  md += `## Per-story captions (for the landscape and story images)\n\n`;
  ed.stories.forEach((s, i) => { md += `**${pad2(i + 1)}: ${s.category}.** ${s.headline}. ${s.why} ${tags}\n\n`; });
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
  const slug = (s) => s.category.toLowerCase();
  await shoot(coverPortrait(1080, 1350), 1080, 1350, 'carousel/00-cover.png');
  for (let i = 0; i < n; i++) await shoot(storyPortrait(ed.stories[i], i, 1080, 1350), 1080, 1350, `carousel/${pad2(i + 1)}-${slug(ed.stories[i])}.png`);
  await shoot(outroPortrait(1080, 1350), 1080, 1350, `carousel/${pad2(n + 1)}-follow.png`);
  await shoot(coverPortrait(1080, 1920), 1080, 1920, 'stories/00-cover.png');
  for (let i = 0; i < n; i++) await shoot(storyPortrait(ed.stories[i], i, 1080, 1920), 1080, 1920, `stories/${pad2(i + 1)}-${slug(ed.stories[i])}.png`);
  await shoot(outroPortrait(1080, 1920), 1080, 1920, `stories/${pad2(n + 1)}-follow.png`);
  for (let i = 0; i < n; i++) await shoot(storyLandscape(ed.stories[i]), 1200, 675, `landscape/${pad2(i + 1)}-${slug(ed.stories[i])}.png`);
  await browser.close();

  fs.writeFileSync(path.join(outDir, 'captions.md'), captions());
  const zipName = `ai-news-brief-issue-${ed.issue}-${ed.date}.zip`;
  fs.rmSync(path.join(__dirname, 'out', zipName), { force: true });
  execSync(`cd "${outDir}" && zip -qr "../${zipName}" .`);
  console.log(`Built ${outDir} and out/${zipName}`);
})();
