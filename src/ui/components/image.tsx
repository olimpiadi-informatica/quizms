import React from "react";

type ImageSrc = {
  src: string;
  width: string;
  height: string;
};

type Props = {
  src: ImageSrc;
  alt: string;
  title?: string;
};

export default function Image({ src, alt, title }: Props) {
  return (
    <img
      className="max-h-screen min-w-0 p-4 first:rounded-l-xl last:rounded-r-xl dark:bg-white print:m-0 print:max-w-full"
      src={src.src}
      width={src.width}
      height={src.height}
      alt={alt}
      title={title}
      style={{ maxWidth: `calc(100vh * ${src.width} / ${src.height})` }}
    />
  );
}
