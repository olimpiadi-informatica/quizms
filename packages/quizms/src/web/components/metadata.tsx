import { createContext, type ReactNode, use, useEffect } from "react";

const MetadataContext = createContext<{ title: string }>({ title: "Quizms" });

export function TitleProvider({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return <MetadataContext.Provider value={{ title }}>{children}</MetadataContext.Provider>;
}

export function Title() {
  const { title } = use(MetadataContext);
  return title;
}
