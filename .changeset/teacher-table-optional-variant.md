---
"@olinfo/quizms": patch
"@olinfo/quizms-firebase": patch
---

Allow teachers to insert students without immediately assigning a variant and to clear variants in the teacher table:
- In contests with variants, newly inserted students are no longer automatically assigned the default variant.
- Teachers can clear a student's assigned variant by emptying the variant cell.
- Scores and submission calculations now safely handle students without an assigned variant.
