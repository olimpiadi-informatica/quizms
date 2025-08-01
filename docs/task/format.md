# Problem Format

Each problem is represented by a **Markdown** file:

```md
How much is 2 + 2?

:::answers{.anyCorrect}

- [ ] 2
- [ ] 3
- [x] 4
- [ ] 5

:::

> The solution is 4.
```

The file is composed of three parts:

- **the statement**: the description of what the problem is asking;
- **the answers**: the part where the user chooses the correct answer;
- **the solution**: the explanation on how to solve the problem, shown after the test is completed.

An header for the question is automatically generated with the problem number (e.g. `Question 1`, `Question 2`, etc.) and doesn't have to be included in the Markdown file.

::: tip
Answers and solution can be placed anywhere in the text, but it is recommended to put them in this suggested order.
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

Answers are written within a [generic directive for a styled block](https://github.com/remarkjs/remark-directive?tab=readme-ov-file#example-styled-blocks), of the form:

  ```md
  :::answers{.TYPE}

  DESCRIPTION

  :::
  ```

There are currently four supported types of answers:

- **single-choice answers (anyCorrect)**, defined using a [TODO list](https://www.markdownguide.org/extended-syntax/#task-lists) where the correct answers are marked with an `x`:
  ```md
  :::answers{.anyCorrect}

  - [ ] answer 1
  - [x] answer 2
  - [ ] answer 3
  - [ ] answer 4

  :::
  ```
  It is possible to indicate multiple correct answers, but the user can select only one answer. The answer will be considered correct if the user selects any of the answers that are marked as correct.

- **multiple-choice answers (allCorrect)**, also defined using a [TODO list](https://www.markdownguide.org/extended-syntax/#task-lists) where the correct answers are marked with an `x`:
  ```md
  :::answers{.allCorrect}

  - [ ] answer 1
  - [x] answer 2
  - [x] answer 3
  - [ ] answer 4

  :::
  ```
  In this case, the user can select any number of options (from zero to all). The answer will be considered correct if the user selects exactly **all** of the answers that are marked as correct. The answer will be considered missing if the user does not select any answer.

- **open-ended answer (open)**, defined with a special `?>` syntax:
  ```md
  :::answers{.open}

  ?> answer

  :::
  ```
  If the answer is a number, it will be rendered as a numeric input; otherwise, it will be rendered as a short textual input. The answer will be considered correct if it matches exactly the given answer.
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

:::answers{.anyCorrect}

- [x] Yes
- [ ] No

:::

> Solution 1 ...

---

Subproblem 2 ...

:::answers{.open}

?> BDC

:::

> Solution 2 ...
```

Each subproblem has its own text, answers, solution, and a header automatically generated with the problem and subproblem number (e.g., `Question 1.1`, `Question 1.2`, etc).
