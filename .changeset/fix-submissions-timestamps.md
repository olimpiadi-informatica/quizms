---
"@olinfo/quizms-firebase": patch
---

Fixed the `submissions` Cloud Function failing with `expected date, received Timestamp`. Firestore Timestamps are now converted to dates even when they come from a different copy of `firebase-admin`, and the generated functions `package.json` now pins `firebase-admin` so only one copy is installed.
