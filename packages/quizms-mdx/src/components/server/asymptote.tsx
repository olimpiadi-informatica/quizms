import { type AsySrc, transformAsymptote } from "~/asymptote";

import { Image } from "../client/image";

type Props = {
  src: AsySrc;
  alt: string;
  title?: string;
};

export async function Asymptote({ src, alt, title }: Props) {
  const asy = await transformAsymptote(src);
  return <Image alt={alt} title={title} src={asy} />;
}
