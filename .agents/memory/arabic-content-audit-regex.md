---
name: Arabic content audit regex
description: How to correctly detect Arabic script when auditing BANCO i18n/seed/API content with ripgrep
---

When auditing whether content (i18n values, seed listing titles, live API responses)
is actually Arabic vs untranslated English, use the **correct** Arabic matcher:

- CORRECT: `rg '\p{Arabic}'` (or codepoint range `[\x{0600}-\x{06FF}]`).
- WRONG: `rg '[\xD8-\xDB]'` — in ripgrep this matches Unicode codepoints
  U+00D8–U+00DB (Latin `Ø Ù Ú Û`), NOT Arabic. It silently matches nothing on
  Arabic text, producing false "no Arabic content found" conclusions.

**Why:** A bare-byte range looks like it targets the UTF-8 lead bytes of Arabic,
but rg matches by Unicode codepoint, not raw bytes. Using it led to a wrong
conclusion that seed.ts and live search had zero Arabic listings; with
`\p{Arabic}` the seed actually has ~13 Arabic-titled listings and
`/api/v1/search?category=industrial` serves several live.

**How to apply:** Any time you grep BANCO content for Arabic presence/absence
(i18n completeness, seed realism, API output), reach for `\p{Arabic}`. Also note:
the mobile i18n is a single `constants/i18n.ts` with `ar: typeof en`, so TS already
guarantees no missing keys — audits should focus on (a) `ar` values left in English
and (b) hardcoded English in JSX bypassing `t()`/`AppText`, not missing keys.
Legit ASCII `ar` values that are NOT bugs: "AI", "English" (language label),
and Incoterms EXW/FCA/FOB/CFR/CIF/DAP/DDP.

Also remember `/api/v1/search` rejects `limit>50` with INVALID_DATA (an empty
`data:[]` then is a validation error, not "no results") — keep audit limits <=50.
