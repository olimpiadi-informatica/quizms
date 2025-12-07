import child_process from "node:child_process";
import { access, readFile, rm, stat } from "node:fs/promises";
import { platform } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import svgToMiniDataURI from "mini-svg-data-uri";

import sizeOf from "image-size";
import { temporaryFile, temporaryWrite } from "tempy";

import { createAsymptoteInject } from "./inject";

const execFile = promisify(child_process.execFile);

export type AsySrc = {
  fileName: string;
  hash: string;
  inject: object | null;
};

export async function compileAsymptote({ fileName, inject }: AsySrc) {
  const svgFile = temporaryFile({ extension: "svg" });

  const injectString = createAsymptoteInject(inject);
  const injectFile = await temporaryWrite(injectString ?? "", { extension: "asy" });

  if (platform() === "darwin") {
    const pdfFile = await execAsy(fileName, injectFile, "pdf");

    try {
      await execFile("pdf2svg", [pdfFile, svgFile]);
      await rm(pdfFile);
    } catch (err: any) {
      throw new Error(`Failed to run pdf2svg:\n${err.stderr ?? err.message}`);
    }
  } else {
    await execAsy(fileName, injectFile, "svg", "-tex", "pdflatex");
  }

  const svg = await readFile(svgFile);
  const size = sizeOf(svg);
  return {
    src: svgToMiniDataURI(svg.toString()),
    width: size.width,
    height: size.height,
  };
}

async function execAsy(
  fileName: string,
  injectFile: string,
  extension: string,
  ...extraArgs: string[]
) {
  let outputFile: string;
  try {
    outputFile = temporaryFile({ extension });
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

  return outputFile;
}
