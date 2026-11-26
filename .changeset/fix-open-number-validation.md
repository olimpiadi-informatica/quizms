---
"@olinfo/quizms-mdx": patch
---

Validate `openNumber` inputs on the client so non-numeric characters are rejected before typing and intermediate states (`-`, `.`, `-.`, trailing `.`) are preserved without submitting `NaN`.
