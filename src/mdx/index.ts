import { CompileOptions } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkMdxMathEnhancedPlugin from "remark-mdx-math-enhanced";
import remarkSmartypants from "remark-smartypants";
import { PluggableList } from "unified";

import remarkMermaid from "~/mdx/remark-mermaid";

import recmaRemoveExports from "./recma-remove-exports";
import recmaVariants from "./recma-variants";
import rehypeFixWrap from "./rehype-fix-wrap";
import remarkAnswers from "./remark-answers";
import remarkHighlight from "./remark-highlight";
import remarkImages from "./remark-images";
import remarkProblemIds from "./remark-problem-ids";

export const remarkPlugins: PluggableList = [
  remarkAnswers,
  remarkFrontmatter,
  remarkGfm,
  remarkMermaid,
  remarkHighlight,
  remarkMath,
  remarkMdxFrontmatter,
  remarkImages,
  [remarkMdxMathEnhancedPlugin, { component: "MathExpr" }],
  remarkProblemIds,
  [remarkSmartypants, { dashes: "oldschool" }],
];

export const rehypePlugins: PluggableList = [rehypeFixWrap];

export const recmaPlugins: PluggableList = [recmaRemoveExports, recmaVariants];

export const mdxOptions: CompileOptions = {
  remarkPlugins,
  rehypePlugins,
  recmaPlugins,
  providerImportSource: "@mdx-js/react",
  format: "mdx",
  mdxExtensions: [".md", ".mdx"],
};
