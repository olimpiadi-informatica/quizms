import { readFile } from "node:fs/promises";
import path from "node:path";

import sizeOf from "image-size";
import svgToMiniDataURI from "mini-svg-data-uri";
import sharp, { type ResizeOptions } from "sharp";
import { optimize } from "svgo";

export type ImageOptions = ResizeOptions & { scale?: number };

type SvgImage = {
  format: ".svg";
  data: string;
};

type WebpImage = {
  format: ".webp";
  data: Buffer;
};

export type Image = (SvgImage | WebpImage) & { width: number; height: number };

export function transformSvg(filename: string, content: string, options: ImageOptions): Image {
  const { data } = optimize(content, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupIds: {
              minify: false,
              remove: false,
            },
            inlineStyles: false,
          },
        },
      },
    ],
    path: filename,
  });

  let { width, height } = sizeOf(Buffer.from(data, "utf8"));
  if (!width || !height) {
    throw new Error("Unable to determine size of SVG image");
  }

  if (options.scale) {
    width *= options.scale;
    height *= options.scale;
  } else if (options.width || options.height) {
    const aspectRatio = width / height;
    width = options.width || options.height! * aspectRatio;
    height = options.height || options.width! / aspectRatio;
  }

  return { format: ".svg", data, width, height };
}

export async function transformRaster(fileName: string, options: ImageOptions): Promise<Image> {
  const image = await readFile(fileName);
  let process = sharp(image).webp();

  if (options.scale) {
    const size = sizeOf(image);
    options.width = Math.round(size.width! * options.scale);
    options.height = Math.round(size.height! * options.scale);
  }

  if (options.width || options.height) {
    options.width ||= undefined;
    options.height ||= undefined;
    process = process.resize(options);
  }

  const { data, info } = await process.toBuffer({ resolveWithObject: true });
  return {
    format: ".webp",
    data,
    width: info.width,
    height: info.height,
  };
}

export function transformImage(
  filename: string,
  content: string,
  options: ImageOptions,
): Promise<Image> {
  if (path.extname(filename) === ".svg") {
    return Promise.resolve(transformSvg(filename, content, options));
  }
  return transformRaster(filename, options);
}

export function imageToDataUri(image: Image) {
  if (image.format === ".svg") {
    return svgToMiniDataURI(image.data);
  }
  return `data:image/webp;base64,${image.data.toString("base64")}`;
}

export function parseImageOptions(params: URLSearchParams): ImageOptions {
  return {
    scale: params.has("s") ? Number(params.get("s")) : undefined,
    width: params.has("w") ? Number(params.get("w")) : undefined,
    height: params.has("h") ? Number(params.get("h")) : undefined,
  };
}
