import child_process from "node:child_process";
import { access, readFile, rm, stat } from "node:fs/promises";
import { platform } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { type ImageOptions, imageToDataUri, transformSvg } from "@olinfo/quizms/utils-node";
import { temporaryFile, temporaryWrite } from "tempy";

import { createAsymptoteInject } from "./inject";

const execFile = promisify(child_process.execFile);

export type AsySrc = {
  fileName: string;
  hash: string;
  inject: object | null;
  options: ImageOptions;
};

export async function compileAsymptote({ fileName, inject, options }: AsySrc) {
  const svgFile = temporaryFile({ extension: "svg" });

  const injectString = createAsymptoteInject(inject);
  const injectFile = await temporaryWrite(injectString ?? "", { extension: "asy" });

  if (platform() === "darwin") {
    const pdfFile = temporaryFile({ extension: "pdf" });
    await execAsy(fileName, injectFile, pdfFile, "pdf");

    try {
      await execFile("pdf2svg", [pdfFile, svgFile]);
      await rm(pdfFile);
    } catch (err: any) {
      throw new Error(`Failed to run pdf2svg:\n${err.stderr ?? err.message}`);
    }
  } else {
    await execAsy(fileName, injectFile, svgFile, "svg", "-tex", "pdflatex");
  }

  const image = transformSvg(svgFile, await readFile(svgFile, "utf-8"), options);
  return {
    src: imageToDataUri(image),
    width: image.width,
    height: image.height,
  };
}

async function execAsy(
  fileName: string,
  injectFile: string,
  outputFile: string,
  extension: string,
  ...extraArgs: string[]
) {
  try {
    await execFile(
      "asy",
      [
        fileName,
        "-f",
        extension,
        "-autoimport",
        injectFile,
        "-o",
        outputFile.replace(/\.\w+$/, ""),
        ...extraArgs,
      ],
      { cwd: path.dirname(fileName) },
    );
  } catch (err: any) {
    throw new Error(`Failed to compile asymptote:\n${err.stderr ?? err.message}`);
  }

  try {
    await access(outputFile);
  } catch {
    throw new Error("Failed to compile asymptote: Output file does not exist.");
  }

  const { size } = await stat(outputFile);
  if (size === 0) throw new Error("Failed to compile asymptote: Output file is empty.");
}
