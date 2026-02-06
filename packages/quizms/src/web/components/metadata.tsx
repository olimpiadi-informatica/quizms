import { createContext, type ReactNode, use } from "react";

const MetadataContext = createContext<{ title: string }>({ title: "Quizms" });

export function TitleProvider({ title, children }: { title: string; children: ReactNode }) {
  return (
    <MetadataContext.Provider value={{ title }}>
      <title>{title}</title>
      {children}
    </MetadataContext.Provider>
  );
}

export function Title() {
  const { title } = use(MetadataContext);
  return title;
}
