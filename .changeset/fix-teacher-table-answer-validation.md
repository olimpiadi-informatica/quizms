---
"@olinfo/quizms": patch
---

Fixed client-side answer validation in the teacher table:
- Closed answers (multiple choice and multiple response) entered by teachers are no longer rejected as invalid due to AG Grid valueParser object coercion.
- Answer values are now properly normalized from parsed answer objects and raw strings.
