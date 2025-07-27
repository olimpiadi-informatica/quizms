# Import the Contest

Contest data must be saved in the `data` directory of the project. Files can be in TOML, YAML, CSV, JSON, or JSONL format.

If you haven't already, [log in to Google Cloud](./setup#complete-the-configuration).

## Import Contests

Contests are described by the `data/contests.{toml,yaml,csv,json,jsonl}` file. The format is as follows; fields can be in either camelCase or snake\_case:

| Field                  | Description                                                                    | Type       | Notes                                                                  |
|------------------------|--------------------------------------------------------------------------------|------------|------------------------------------------------------------------------|
| `id`                   | Contest ID.                                                          | `string`   |                                                                        |
| `name`                 | Contest Name.                                                        | `string`   |                                                                        |
| `long_name`            | Extended contest name.                                               | `string`   | Optional.                                                    |
| `problem_ids`          | Problem IDs.                                                         | `string[]` |                                                                        |
| `user_data`            | Personal information requested from students during registration.    | `object[]` |                                                                        |
| `has_variants`         | If there are multiple text variants.                                 | `boolean`  |                                                                        |
| `has_online`           | If the contest can be taken online.                                  | `boolean`  |                                                                        |
| `has_pdf`              | If the contest can be taken in paper mode.                           | `boolean`  |                                                                        |
| `statement_version`    | Text version.                                                        | `number`   | Must be incremented every time the texts are re-imported.    |
| `allow_student_import` | If teachers can import students from a CSV.                          | `boolean`  | Optional.                                                    |
| `allow_student_edit`   |                                                                      | `boolean`  | Optional.                                                    |
| `allow_answer_edit`    |                                                                      | `boolean`  | Optional.                                                    |
| `instructions`         | General Markdown information displayed on the teacher's page.        | `string`   | Optional.                                                    |

If `has_online` is `true`, the following fields are required:

| Field                  | Description                                            | Type       | Notes |
|------------------------|--------------------------------------------------------|------------|-------|
| `contest_window_start` | Contest start date.                          | `date`     |       |
| `contest_window_end`   | Contest end date.                            | `date`     |       |
| `duration`             | Contest duration in minutes.                 | `number`   |       |
| `allow_restart`        | If teachers can start the contest multiple times. | `boolean`  |       |

Personal information in the `user_data` field must have the following format:

| Field    | Description                                                      | Type                            | Notes                                                        |
|----------|------------------------------------------------------------------|---------------------------------|--------------------------------------------------------------|
| `name`   | Field name.                                            | `string`                        |                                                              |
| `label`  | Readable field name.                                   | `string`                        |                                                              |
| `type`   | Field type.                                            | `"text"`, `"number"` or `"date"` |                                                              |
| `size`   | Field width in the teacher's table.                    | `"xs"`, `"sm"`, `"md"` or `"lg"` | Optional.                                          |
| `min`    | Minimum field value.                                   | `number` or `date`              | Required for date fields, optional for numeric fields. |
| `max`    | Maximum field value.                                   | `number` or `date`              | Required for date fields, optional for numeric fields. |
| `pinned` | If the field should be pinned to the left in the teacher's table. | `boolean`                       | Optional.                                          |

::: details Example file

::: code-group

```toml [TOML]
[oii-scolastiche]
name = "OII - Scolastiche"
long_name = "Olimpiadi Italiane di Informatica 2023/2024 - Selezione scolastica"
problem_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.1, 16.2]
user_data = [
    { name = "surname",      label = "Cognome",         type = "text",   pinned = true },
    { name = "name",         label = "Nome",            type = "text" },
    { name = "classYear",    label = "Classe",          type = "number", size = "xs", min = 1, max = 5 },
    { name = "classSection", label = "Sezione",         type = "text",   size = "xs" },
    { name = "birthDate",    label = "Data di nascita", type = "date",   min = 1990-01-01, max = 2013-12-31 },
]
has_variants = true
has_online = true
has_pdf = true
statement_version = 1
allow_student_import = true
allow_student_edit = true
allow_answer_edit = true
contest_window_start = 2023-12-14T08:00:00
contest_window_end = 2023-12-14T16:00:00
duration = 90
allow_restart = true
instructions = """
Istruzioni per la gara:
- queste sono le istruzioni per la gara.
"""
```

```yaml [YAML]
oii-scolastiche:
  name: OII - Scolastiche
  long_name: Olimpiadi Italiane di Informatica 2023/2024 - Selezione scolastica
  problem_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.1, 16.2]
  user_data:
    - name: surname
      label: Cognome
      type: text
      pinned: true
    - name: name
      label: Nome
      type: text
    - name: classYear
      label: Classe
      type: number
      size: xs
      min: 1
      max: 5
    - name: classSection
      label: Sezione
      type: text
      size: xs
    - name: birthDate
      label: Data di nascita
      type: date
      min: 1990-01-01
      max: 2013-12-31
  has_variants: true
  has_online: true
  has_pdf: true
  statement_version: 1
  allow_student_import: true
  allow_student_edit: true
  allow_answer_edit: true
  contest_window_start: 2023-12-14T08:00:00
  contest_window_end: 2023-12-14T16:00:00
  duration: 90
  allow_restart: true
  instructions: |
    Istruzioni per la gara:
    - queste sono le istruzioni per la gara.
```

```json [JSON]
{
  "oii-scolastiche": {
    "name": "OII - Scolastiche",
    "long_name": "Olimpiadi Italiane di Informatica 2023/2024 - Selezione scolastica",
    "problem_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.1, 16.2],
    "user_data": [
      {
        "name": "surname",
        "label": "Cognome",
        "type": "text",
        "pinned": true
      },
      {
        "name": "name",
        "label": "Nome",
        "type": "text"
      },
      {
        "name": "classYear",
        "label": "Classe",
        "type": "number",
        "size": "xs",
        "min": 1,
        "max": 5
      },
      {
        "name": "classSection",
        "label": "Sezione",
        "type": "text",
        "size": "xs"
      },
      {
        "name": "birthDate",
        "label": "Data di nascita",
        "type": "date",
        "min": "1990-01-01",
        "max": "2013-12-31"
      }
    ],
    "has_variants": true,
    "has_online": true,
    "has_pdf": true,
    "statement_version": 1,
    "allow_student_import": true,
    "allow_student_edit": true,
    "allow_answer_edit": true,
    "contest_window_start": "2023-12-14T08:00:00",
    "contest_window_end": "2023-12-14T16:00:00",
    "duration": 90,
    "allow_restart": true,
    "instructions": "Istruzioni per la gara:\n - queste sono le istruzioni per la gara.\n"
  }
}
```

:::

To import contests, use the command:

```sh
$ npx quizms firebase import --contests
```

## Import Schools and Teachers

Schools and teachers are described by the `data/schools.{toml,yaml,csv,json,jsonl}` file. The format is as follows:

| Field          | Description                              | Type                       | Notes                                                                                                                                                                 |
|----------------|------------------------------------------|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`           | School's mechanical code.      | `string`                   |                                                                                                                                                                       |
| `name`         | School name.                   | `string`                   |                                                                                                                                                                       |
| `contest_ids`  | IDs of contests the school participates in. | `string` or `string[]` | You can specify a [picomatch](https://github.com/micromatch/picomatch#globbing-features), for example `"*"` indicates that the school participates in all contests. |
| `password`     | School password.               | `string`                   |                                                                                                                                                                       |
| `pdf_variants` | Paper variants assigned to the school. | `string[]`                 | Optional.                                                                                                                                                   |

::: details Example file

::: code-group

```csv [CSV]
id,name,contest_ids,password
PNTF01000A,ITST J.F.Kennedy,oii-scolastiche,OKYkIZ6xFHPqyFS8HdUk
BOIS01400R,IIS Francesco Alberghetti,oii-scolastiche,n6r2yEKwAxJxBUCad7eS
```

```yaml [YAML]
PNTF01000A:
  name: ITST J.F.Kennedy
  contest_ids: [oii-scolastiche]
  password: OKYkIZ6xFHPqyFS8HdUk
BOIS01400R:
  name: IIS Francesco Alberghetti
  contest_ids: [oii-scolastiche]
  password: n6r2yEKwAxJxBUCad7eS
```

```json [JSON]
{
  "PNTF01000A": {
    "id": "",
    "name": "ITST J.F.Kennedy",
    "contest_ids": ["oii-scolastiche"],
    "password": "OKYkIZ6xFHPqyFS8HdUk"
  },
  "BOIS01400R": {
    "id": "BOIS01400R",
    "name": "IIS Francesco Alberghetti",
    "contest_ids": ["oii-scolastiche"],
    "password": "n6r2yEKwAxJxBUCad7eS"
  }
}
```

:::

To import schools, use the command:

```sh
$ npx quizms firebase import --schools --teachers
```

## Import Variants

Configurations for generating variants must be saved in a `data/variants.{toml,yaml,csv,json,jsonl}` file with the following format:

| Field                  | Description                                                              | Type       | Notes                                                                 |
|------------------------|--------------------------------------------------------------------------|------------|-----------------------------------------------------------------------|
| `id`                   | Contest ID.                                                    | `string`   |                                                                       |
| `secret`               | Secret used to generate variants. Must not be made public.     | `string`   |                                                                       |
| `entry`                | Main MDX file containing problem texts.                        | `string`   | Typically `contest/contest.mdx`.                            |
| `shuffle_problems`     | If problems within a section are shuffled.                     | `boolean`  |                                                                       |
| `shuffle_answers`      | If answers are shuffled.                                       | `boolean`  |                                                                       |
| `variant_ids`          | IDs of online variants.                                        | `string[]` |                                                                       |
| `pdf_variant_ids`      | IDs of paper variants.                                         | `string[]` |                                                                       |
| `pdf_per_school`       | Number of paper variants to assign to each school.             | `number`   |                                                                       |

::: details Example file

::: code-group

```toml [TOML]
[oii-scolastiche]
secret = "FbpU9ertN5WlCngQNqOK"
entry = "contest/contest.mdx"
shuffle_problems = true
shuffle_answers = true
variant_ids = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
pdf_variant_ids = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
pdf_per_school = 3
```

```yaml [YAML]
oii-scolastiche:
  secret: FbpU9ertN5WlCngQNqOK
  entry: contest/contest.mdx
  shuffle_problems: true
  shuffle_answers: true
  variant_ids: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  pdf_variant_ids: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
  pdf_per_school: 3
```

```json [JSON]
{
  "oii-scolastiche": {
    "secret": "FbpU9ertN5WlCngQNqOK",
    "entry": "contest/contest.mdx",
    "shuffle_problems": true,
    "shuffle_answers": true,
    "variant_ids": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    "pdf_variant_ids": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    "pdf_per_school": 3
  }
}
```

:::

To generate the variants, use the following command:

```sh
$ npx quizms variants
```

::: tip

You can also generate variants manually; in that case, each variant must be defined in a JSON file named `variants/$ID/schema.json` with the following format:

| Field       | Description                                  | Type     | Notes |
|-------------|----------------------------------------------|----------|-------|
| `id`        | Variant ID.                        | `string` |       |
| `contestId` | ID of the contest the variant belongs to. | `string` |       |
| `schema`    | The question schema.               | `object` |       |

The schema is an object containing, for each question, an object with the following format:

| Field            | Description                         | Type                              | Notes        |
|------------------|-------------------------------------|-----------------------------------|--------------|
| `type`           | Question type.            | `"text"`, `"number"` or `"points"` |              |
| `originalId`     | Question ID before shuffling. | `string`                          | Optional. |
| `optionsCorrect` | Correct answers.          | `string[]`                        | Optional. |
| `optionsBlank`   | Blank answers.            | `string[]`                        | Optional. |
| `optionsWrong`   | Incorrect answers.        | `string[]`                        | Optional. |
| `pointsCorrect`  | Points for correct answer. | `number`                          | Optional. |
| `pointsBlank`    | Points for blank answer.  | `number`                          | Optional. |
| `pointsWrong`    | Points for wrong answer.  | `number`                          | Optional. |

If options or points are not specified, student scores will not be calculated.

::: details Example variant

```json
{
  "id": "10",
  "contestId": "oii-scolastiche",
  "schema": {
    "1": {
      "type": "text",
      "optionsCorrect": ["A"],
      "optionsBlank": ["-"],
      "optionsWrong": ["B","C","D","E"],
      "pointsCorrect": 5,
      "pointsBlank": 1,
      "pointsWrong": 0
    },
    "2": {
      "type": "text",
      "optionsCorrect": ["B"],
      "optionsBlank": ["-"],
      "optionsWrong": ["A","C","D","E"],
      "pointsCorrect": 5,
      "pointsBlank": 1,
      "pointsWrong": 0
    }
  }
}
```

:::

To import variants, use the command:

```sh
$ npx quizms firebase import --variants --variant-mappings --statements
```

## Import Paper Tests

To import the PDFs of paper tests, use the commands:

```sh
$ npx quizms print
$ npx quizms firebase import --pdfs
```

## Deploy the Website

To deploy the website, use the commands:

```sh
$ firebase deploy --only hosting
```