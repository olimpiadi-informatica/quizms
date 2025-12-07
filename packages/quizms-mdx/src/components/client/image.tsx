type ImageSrc = {
  src: string;
  width: number;
  height: number;
};

type Props = {
  src: ImageSrc | null;
  isLoading?: boolean;
  alt: string;
  title?: string;
};

export function Image({ src, isLoading, alt, title }: Props) {
  if (isLoading) {
    return (
      <span className="p-4 first:rounded-l-xl last:rounded-r-xl bg-primary text-primary-content">
        Caricamento...
      </span>
    );
  }

  if (!src) {
    return (
      <span className="p-4 first:rounded-l-xl last:rounded-r-xl bg-error text-error-content">
        Missing image
      </span>
    );
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
Image.displayName = "Image";
