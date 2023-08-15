import { CompileOptions, nodeTypes as mdxNodeTypes } from "@mdx-js/mdx";
import rehypeRaw from "rehype-raw";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkMdxMathEnhancedPlugin from "remark-mdx-math-enhanced";
import remarkSmartypants from "remark-smartypants";
import { PluggableList } from "unified";

import recmaRemoveExports from "./recma-remove-exports";
import recmaVariants from "./recma-variants";
import rehypeFixWrap from "./rehype-fix-wrap";
import remarkAnswers from "./remark-answers";
import remarkImages from "./remark-images";
import remarkProblemIds from "./remark-problem-ids";
import remarkSrs from "./remark-srs";

export const remarkPlugins: PluggableList = [
  remarkAnswers,
  remarkFrontmatter,
  remarkGfm,
  remarkMath,
  remarkMdxFrontmatter,
  remarkImages,
  [remarkMdxMathEnhancedPlugin, { component: "MathExpr" }],
  remarkProblemIds,
  [remarkSmartypants, { dashes: "oldschool" }],
  remarkSrs,
];

export const rehypePlugins: PluggableList = [
  rehypeFixWrap,
  [rehypeRaw, { passThrough: mdxNodeTypes }],
];

export const recmaPlugins: PluggableList = [recmaRemoveExports, recmaVariants];

export const mdxOptions: CompileOptions = {
  remarkPlugins,
  rehypePlugins,
  recmaPlugins,
  providerImportSource: "@mdx-js/react",
  format: "mdx",
  mdxExtensions: [".md", ".mdx"],
};
