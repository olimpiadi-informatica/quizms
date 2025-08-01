---
search: false
---

# TODO

The documentation on creating a project is currently under construction.
However, you can try copying and modifying the following demo project:

> [https://github.com/olimpiadi-informatica/quizms-demo](https://github.com/olimpiadi-informatica/quizms-demo)

In particular, the project contains a `header.md` file with general information that is shown to users even before the start of the contests, and the structure of the contest itself is defined in the `contest.mdx` file, which can contain:
- sections (e.g., `## Section X`) to group questions;
- arbitrary Markdown text;
- commands for importing questions, written as:
```
<Problem points={[5, 1, 0]}><P1Task /></Problem>
```
which imports the question in folder `p-1-task`, grading it with 5 points for a correct answer, 1 point for a missing answer, and 0 points for a wrong answer.