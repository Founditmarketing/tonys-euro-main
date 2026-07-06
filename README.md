# Tony's European Auto Service

Static marketing site + one serverless function for the AI Service Advisor.
Stack: plain HTML/CSS/JS, deployed on Vercel. No build step.

## Structure
```
index.html            # the whole site (single file)
assets/               # logo + photography
api/diagnose.js       # Vercel function: proxies the chat to Anthropic
vercel.json           # caching + security headers
```

## Local preview
- Static only (everything except the live Advisor chat): just open `index.html`.
- Full preview incl. the Advisor: `npm i -g vercel` then `vercel dev`
  (you'll be prompted for the env var below).

## Deploy (GitHub → Vercel)
1. Push this folder to a GitHub repo.
2. In Vercel: New Project → import the repo. Framework preset: **Other**. No build command, output dir = root.
3. Add Environment Variable:
   - `ANTHROPIC_API_KEY` = your Anthropic key (Production + Preview).
4. Deploy. Point the `tonyseuro.com` domain at the project in Vercel → Domains.

## The Service Advisor
- Frontend posts the chat history to `/api/diagnose`.
- The function injects the system prompt server-side and calls Anthropic. The key never reaches the browser.
- Model defaults to `claude-sonnet-4-6`. For lower cost, switch to `claude-haiku-4-5-20251001` in `api/diagnose.js`.

## Notes / to confirm with the client
- **Logo**: `assets/logo.png` was rebuilt from a photo (crisp at header size, not vector). If TJ has the original vector/transparent logo, drop it in to replace.
- **OG/canonical** tags assume the `https://tonyseuro.com/` domain — update if different.
- **Bosch certification**: not currently claimed in copy. If still certified, add the badge to the "Standard" section.
- Photos are compressed web versions; replace with higher-res originals in `assets/` (keep the same filenames) any time.
