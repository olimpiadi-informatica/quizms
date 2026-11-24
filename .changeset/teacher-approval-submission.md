---
"@olinfo/quizms": minor
"@olinfo/quizms-firebase": minor
"@olinfo/quizms-mdx": patch
"@olinfo/quizms-training": patch
---

Added the `teacher_approval` termination mode for online contests (`onlineSettings.terminationMode`, default `immediate`).
- When the student finishes, the test is locked and waits for the teacher, who can approve the submission or send the test back. The student's time keeps running in the meantime.
- Teachers see the requests in a new "Submission requests" panel of the dashboard and in the status column of the table (new `teacherApproveSubmission` and `teacherRejectSubmission` APIs and optional `approveSubmission` and `rejectSubmission` props of `TeacherProvider`).
- Requests still pending at the end of the contest are recorded as submitted when the scores are computed.
- The student context exposes the new `locked` field (true while waiting for the teacher and after the end of the test), used by the answer components to disable the inputs.
- Training always ends the test immediately.
