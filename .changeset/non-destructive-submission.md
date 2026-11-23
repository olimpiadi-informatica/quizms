---
"@olinfo/quizms": minor
"@olinfo/quizms-firebase": minor
---

Submitting a contest no longer shortens the student's participation window. The submission is now recorded in the new `status`, `submittedAt` and `submittedBy` fields of the student, so the time allotted to the student is kept.
- Teachers can reopen the contest of a student who submitted by mistake, as long as the student's time is not over (new `teacherReopenStudent` API and optional `reopenStudent` prop of `TeacherProvider`).
- The teacher table has a new "Status" column for online contests (not started, in progress, submitted, time expired), and the export includes the status, submission time and who submitted.
- The student context exposes the new `phase` field. `getStudentPhase`, `isStudentTerminated` and `useStudentPhase` are exported.
