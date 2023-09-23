declare module "react-syntax-highlighter/dist/esm/highlight" {
  import { ComponentType } from "react";
  import { SyntaxHighlighterProps } from "react-syntax-highlighter";

  export default function BasicSyntaxHighlighter(
    astGenerator: any,
    style: any,
  ): ComponentType<SyntaxHighlighterProps>;
}
