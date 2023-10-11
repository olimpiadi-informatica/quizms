import React from "react";

import _ from "lodash";

type ImageSrc = {
  src: string;
  width: string;
  height: string;
};

type ImageProps = {
  variant: number;
};

type Props = {
  src: ImageSrc | (({ variant }: ImageProps) => ImageSrc);
  alt: string;
  title?: string;
  variant: number;
};

export default function Image({ src, alt, title, variant }: Props) {
  if (_.isFunction(src)) {
    src = src({ variant });
  }

  return (
    <img
      className="max-h-screen min-w-0 max-w-full p-4 first:rounded-l-xl last:rounded-r-xl dark:bg-white"
      src={src.src}
      width={src.width}
      height={src.height}
      alt={alt}
      title={title}
    />
  );
}
