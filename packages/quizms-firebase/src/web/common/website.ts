import { useCollection } from "~/web/hooks";

import { websiteConverter } from "./converters";

export function useWebsite() {
  const [websites] = useCollection("websites", websiteConverter, {
    constraints: { origin: window.location.origin },
  });

  if (websites.length === 0) {
    throw new Error("Invalid origin");
  }

  return websites[0];
}
