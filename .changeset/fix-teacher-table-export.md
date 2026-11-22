---
"@olinfo/quizms": patch
---

Fixed the students table and CSV export in the teacher portal (#95):

- Answers are shown again in the students table and can be edited. The variant column shows the student's variant, and changing it recalculates the score with the new variant.
- Numeric answers entered in the table are no longer always rejected as invalid, and answer tooltips show the answer instead of `[object Object]`.
- Blockly answers are read-only in the table.
- The CSV export contains the answers instead of `[object Object]`, in the same format accepted by the import.
