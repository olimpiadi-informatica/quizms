import { reactComponentCase } from "~/utils";

/**
 * Code for the virtual dev/print entries rendering a contest header in the current statement
 * language.
 *
 * @param translations translated header files (relative to `src`) by language
 */
export function headerEntry(
  contestId: string,
  header: string,
  translations: Record<string, string>,
) {
  const name = `${reactComponentCase(contestId)}Header`;
  const imports = [`import ${name} from ${JSON.stringify(`/${header}`)};`];
  const entries: string[] = [];
  for (const [language, file] of Object.entries(translations)) {
    imports.push(`import ${name}$${language} from ${JSON.stringify(`/${file}`)};`);
    entries.push(`${JSON.stringify(language)}: ${name}$${language}`);
  }

  const element =
    entries.length > 0
      ? `<Localized base={${name}} translations={{ ${entries.join(", ")} }} />`
      : `<${name} />`;
  return { imports, element };
}
