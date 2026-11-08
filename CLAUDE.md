# Instructions for Claude: weekly AI News media pack

This repository produces "AI News Brief" by Social Co-Lab, a weekly media pack of AI news graphics and captions.

When asked to produce this week's pack, follow the "The weekly run" steps in README.md exactly:
1. Search the web (WebSearch) for the last 7 days of AI news and pick 5 varied, important stories.
2. Verify each story with a second search; use "reportedly" for single-source claims; never invent numbers.
3. Copy the newest file in `editions/` to `editions/YYYY-MM-DD.json` (today's date), increase `issue` by 1, update `week_label` and `date`, keep `brand`/`org`/`handle` unchanged, and replace the stories. Keep stats to 7 characters or fewer when possible.
4. Build: `NODE_PATH=$(npm root -g) node build.js editions/YYYY-MM-DD.json`
5. QA: Read the cover, one carousel slide, one story slide and one landscape PNG. Fix any overflowing or badly wrapped text by editing the JSON and rebuilding.
6. Commit the new edition JSON and `out/` files to `main` with the message "Issue #N: week of ..." and push.
7. Send the zip and cover image to the user with SendUserFile, and list the 5 stories with their source links.
