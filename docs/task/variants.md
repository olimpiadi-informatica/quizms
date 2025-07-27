# Variants

It is possible to create multiple variants of a problem; each user will receive a specific variant and will not be able to see the variants of others.

A variant is defined by an object that contains the variables to substitute in the text. To define the variants, you must declare an array of objects, where each element contains the variables for one variant.
::: warning WARNING
Variable names **must** start with a lowercase letter.
:::

To substitute variables in the text, use curly braces around the variable name:

```md
The value of `x` is {x}.
```

You can also use more complex expressions:

```md
The value of `x+y` is {x+y}.
```

To use variables inside LaTeX formulas, use the `\js` command:

```LaTeX
$x + y = \js{x+y}$
```

The use of variants in asymptote files is partially supported. To use them, define the variants in [Python](#python) format and specify the file with the variants as a parameter of the image:

```md
![Image](image.asy?v=variants.py)
```

Variants can be generated in different ways:

- [Front Matter](#front-matter);
- [JavaScript](#javascript);
- [Python](#python).

## Front Matter

You can declare variants using Front Matter by defining a YAML block at the beginning of the file, delimited by three dashes `---`.

```md
---
variants:
  - x: 2
  - x: 3
  - x: 4
---

Problem text...
```

The array containing the variants must be named `variants`.

## JavaScript

You can declare variants by exporting the `variants` variable at the beginning of the file. This allows the use of more complex functions to generate the variants.

```js
export function buildVariant(x, y) {
  return { x, y, sum: x + y };
}

export const variants = [buildVariant(4, 5), buildVariant(2, 6), buildVariant(3, 7)];

Problem text...
```

## Python

You can declare variants in a Python file. The file must print a JSON array of variants to standard output.

```py
import json

variants = [
    dict(x=4, y=5),
    dict(x=2, y=6),
    dict(x=3, y=7),
]

print(json.dumps(variants))
```

Then you need to import the Python file into the problem:

```js
import variants from "./variants.py";

Problem text...
```
