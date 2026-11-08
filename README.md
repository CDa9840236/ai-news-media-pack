# AI News Brief by Social Co-Lab: weekly AI news media pack

An AI-run pipeline that turns each week's AI news into a ready-to-post media pack.

## What each pack contains
- `carousel/`: 7 slides at 1080×1350 (cover, 5 stories, follow CTA) for Instagram and LinkedIn
- `stories/`: 6 vertical slides at 1080×1920 for IG/FB Stories, Reels and TikTok
- `landscape/`: 5 cards at 1200×675 for X, LinkedIn posts, blogs and newsletters
- `captions.md`: carousel caption, X/Threads thread, per-image captions and source links
- `ai-news-brief-issue-N-DATE.zip`: everything above in one file

## The weekly run (what the AI agent does)
1. **Research:** search the web for the past 7 days of AI news. Pick 5 stories that are important, varied (policy, funding, product, research, enterprise, infrastructure) and confirmed by at least one credible outlet.
2. **Verify:** run a second search on each story. Say "reportedly" for anything with only one source. Never invent numbers.
3. **Write:** create `editions/YYYY-MM-DD.json` in the same format as the previous edition, with the issue number increased by 1. Each story needs a category, a short stat (7 characters or fewer looks best), a stat label, a headline under 60 characters, a 1–2 sentence summary, a one-line "why it matters", sources and URLs.
4. **Build:** `NODE_PATH=$(npm root -g) node build.js editions/YYYY-MM-DD.json`
5. **QA:** open the cover, one carousel slide, one story and one landscape PNG. Check that no text overflows or wraps badly, and fix the JSON if it does.
6. **Deliver:** send the zip and a preview, and list the stories and sources.

## Brand (Social Co-Lab)
- Colors: rich caramel, gold metallic, cream, blush pink and black (the `C`, `GOLD` and `GOLD_TEXT` values in `build.js`)
- Logo: `assets/logo-full.png` (outro slide) and `assets/logo-mark.png` (header on every slide), both with transparent backgrounds. Use them only on light backgrounds; the flask interior is transparent.
- Edition fields: `brand` ("AI News Brief"), `org` ("Social Co-Lab"), `handle`, and the cover title split into `cover_title_pre` (black) and `cover_title_gold` (gold)
- Layouts: the template functions in `build.js` (plain HTML/CSS rendered with Playwright)
