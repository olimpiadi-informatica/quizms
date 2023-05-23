import { PluggableList } from "unified";
import { CompileOptions, nodeTypes as mdxNodeTypes } from "@mdx-js/mdx";

// Remark plugins
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkMdxImages from "remark-mdx-images";
import remarkMdxMathEnhancedPlugin from "remark-mdx-math-enhanced";
import remarkSmartypants from "remark-smartypants";
import remarkAnswers from "./remark-answers";
import remarkProblemIds from "./remark-problem-ids";
import remarkSrs from "./remark-srs";

// Rehype plugins
import rehypeRaw from "rehype-raw";
import rehypeFixWrap from "./rehype-fix-wrap";

// Recma plugins
import recmaVariants from "./recma-variants";

export const remarkPlugins: PluggableList = [
  remarkAnswers,
  remarkFrontmatter,
  remarkMath,
  remarkMdxFrontmatter,
  remarkMdxImages,
  remarkMdxMathEnhancedPlugin,
  remarkProblemIds,
  [remarkSmartypants, { dashes: "oldschool" }],
  remarkSrs,
];

export const rehypePlugins: PluggableList = [
  rehypeFixWrap,
  [rehypeRaw, { passThrough: mdxNodeTypes }],
];

export const recmaPlugins: PluggableList = [recmaVariants, remarkProblemIds];

export const mdxOptions: CompileOptions = {
  remarkPlugins,
  rehypePlugins,
  recmaPlugins,
  providerImportSource: "@mdx-js/react",
  format: "mdx",
};
