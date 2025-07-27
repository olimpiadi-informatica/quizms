# Problem Format

Each problem is represented by a **Markdown** file:

```md
What is 2 + 2?

- [ ] 2
- [ ] 3
- [x] 4
- [ ] 5

> The solution is 4.
```

The file is composed of four parts:

- **the header**: automatically generated with the problem number, e.g. `Question 1`, `Question 2`, etc.;
- **the statement**: the description of what the problem is asking;
- **the answers**: the part where the user chooses the correct answer;
- **the solution**: the explanation of how to solve the problem, shown after the test is completed.

::: tip
Answers and the solution can be placed anywhere in the text, but it is recommended to put them at the end of the problem.
:::

It is also possible to define problems using [MDX](https://mdxjs.com/) (Markdown with JavaScript), which allows for interactive parts of the problem using JavaScript, such as a [block-based code editor](./blockly).

## Problem statement

The statement is the main part of the problem. It can be formatted using Markdown. Most [Markdown features](https://www.markdownguide.org/basic-syntax/) are supported, as well as some extensions, including:

- [syntax-highlighted code](https://www.markdownguide.org/extended-syntax/#syntax-highlighting) (also for [pseudocode](./pseudocode.svg));
- [images](./images);
- [tables](https://www.markdownguide.org/extended-syntax/#tables);
- [LaTeX math formulas](https://en.wikibooks.org/wiki/LaTeX/Mathematics) (`$...$`).

::: warning WARNING
The following features are **not** supported:

- blockquotes: this syntax is used to indicate the solution;
- horizontal rule (`---`): this syntax is used to separate subproblems;
- TODO lists: this syntax is used to define the answers.
:::

## Answers

Answers can be of three types:

- **multiple-choice answers**, defined using a [TODO list](https://www.markdownguide.org/extended-syntax/#task-lists) where the correct answer is marked with an `x`:
  ```md
  - [ ] answer 1
  - [x] answer 2
  - [ ] answer 3
  - [ ] answer 4
  ```
  ::: tip
  It is possible to indicate multiple correct answers (e.g., in case of typos), but the user can select only one answer.
  :::

- **open-ended answer**, defined with the `?>` syntax:
  ```md
  ?> answer
  ```
  ::: warning
  An open-ended answer can be at most 100 characters long.
  :::

- [block-based code](./blockly): the user can use an integrated editor to implement a solution using block-based programming.

## Solution

The solution is defined using a [blockquote](https://www.markdownguide.org/basic-syntax/#blockquotes-1) and can itself be formatted with Markdown:

```md
> the
> **solution**
> to the
> _problem_
```

During the competition, the solution is not visible to the user. It is only available after the test is finished in training mode.

## Subproblems

It is possible to define multiple subproblems in the same file by separating them with three dashes `---`:

```md
Subproblem 1 ...

- [x] Yes
- [ ] No

---

Subproblem 2 ...

- [ ] Yes
- [x] No
```

Each subproblem has its own text, answers, solution, and a header automatically generated with the problem and subproblem number, e.g., `Question 1.1`, `Question 1.2`, etc.
