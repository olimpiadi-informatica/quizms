import { type ComponentType, type ReactNode, useEffect } from "react";

type Module = {
  default: ComponentType;
};

type Metadata = {
  title?: string;
  description?: string;
};

export async function page(module: Promise<Module & { metadata?: Metadata }>): Promise<Module> {
  const { default: PageComponent, metadata } = await module;

  return {
    default: () => {
      return (
        <PageWrapper metadata={metadata}>
          <PageComponent />
        </PageWrapper>
      );
    },
  };
}

function PageWrapper({ metadata, children }: { metadata?: Metadata; children: ReactNode }) {
  useEffect(() => {
    const title = metadata?.title;
    if (title) document.title = title;
  }, [metadata]);

  return children;
}
