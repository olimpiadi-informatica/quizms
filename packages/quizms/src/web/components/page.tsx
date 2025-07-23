import { type ComponentType, createContext, type ReactNode, useContext, useEffect } from "react";

type Module = {
  default: ComponentType;
};

type Metadata = {
  title?: string;
  description?: string;
};

export async function wrapPage(module: Promise<Module & { metadata?: Metadata }>): Promise<Module> {
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

const PageContext = createContext<Metadata | undefined>(undefined);
PageContext.displayName = "PageContext";

function PageWrapper({ metadata, children }: { metadata?: Metadata; children: ReactNode }) {
  useEffect(() => {
    const title = metadata?.title;
    if (title) document.title = title;
  }, [metadata]);

  return <PageContext value={metadata}>{children}</PageContext>;
}

export function useMetadata() {
  return useContext(PageContext)!;
}
