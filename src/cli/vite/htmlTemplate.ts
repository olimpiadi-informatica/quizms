export default function template(
  body: string,
  head?: string,
  title?: string,
  description?: string,
) {
  return `\
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>${title ?? "QuizMS"}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${description ?? ""}" />
    ${head ?? ""}
  </head>
  <body>
    <div id="app"></div>
    ${body}
  </body>
</html>`;
}
