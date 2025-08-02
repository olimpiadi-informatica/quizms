type ImageSrc = {
  src: string;
  width: number;
  height: number;
};

type Props = {
  src: ImageSrc;
  alt: string;
  title?: string;
};

export function Image({ src, alt, title }: Props) {
  if (!src) {
    return <div className="rounded-box bg-error p-4 text-error-content">Image missing</div>;
  }

  return (
    <img
      className="max-h-[90vh] min-w-0 p-4 first:rounded-l-xl last:rounded-r-xl dark:bg-white print:m-0 print:max-h-[60vh] print:max-w-full"
      src={src.src}
      width={src.width}
      height={src.height}
      alt={alt}
      title={title}
      style={{ maxWidth: `min(100%, ${(90 * src.width) / src.height}vh)` }}
    />
  );
}
