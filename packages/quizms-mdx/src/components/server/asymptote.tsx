import { transformAsymptote } from "~/asymptote";

import { Image } from "../client/image";

type AsySrc = {
  fileName: string;
  hash: string;
  inject: object | null;
};

type Props = {
  src: AsySrc;
  alt: string;
  title?: string;
};

export async function Asymptote({ src, alt, title }: Props) {
  const asy = await transformAsymptote(src.fileName, src.inject);
  return <Image alt={alt} title={title} src={asy} />;
}
