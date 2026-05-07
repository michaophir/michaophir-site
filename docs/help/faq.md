---
title: "FAQ"
order: 7
---

## Do you store my resume or job data?
No. All data is stored locally in your browser using IndexedDB. Your resume is sent to Anthropic's API for parsing but is not stored by RoleScout.

## What companies does Scout support?
Greenhouse, Lever, and Ashby ATS platforms. Most modern tech companies use one of these. Google and Meta are not currently supported (JS-rendered job boards).

## How does match scoring work?
Roles are scored based on four signals: title match (+35), seniority match (+25), domain keywords in the description (+5 each, max 25), and skill keywords (+1 each, max 15). The effective range is 35-100 for scored roles. Roles with blank descriptions are left unscored, not excluded.

## How many free runs do I get?
3 resume parses and 3 config generations per day per IP address. Scout runs are not currently rate-limited — we are doing our best to keep it this way. Add your own Anthropic API key in Settings to bypass the parse and config limits entirely.

## What is the Scout Config Prompt?
The prompt sent to the LLM to generate your target companies and role filters from your resume. Currently read-only. Editable prompt support is planned for a future update.

## Is my API key safe?
Yes. Your API key is stored only in your browser's localStorage and is sent directly to the provider's API. RoleScout never logs or stores your key.
