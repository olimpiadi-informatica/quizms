import { useEffect, useState } from "react";

export default function useHash(initialHash?: string) {
  const [hash, setHash] = useState(initialHash);

  useEffect(() => {
    if (!initialHash) {
      onHashChange();
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);

    function onHashChange() {
      setHash(window.location.hash.slice(1));
    }
  }, [initialHash]);

  useEffect(() => {
    if (hash !== undefined) {
      window.location.hash = hash;
    }
  }, [hash]);

  return hash;
}
