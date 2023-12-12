import { addMilliseconds } from "date-fns";
import useSWR from "swr/immutable";

export default function useTime() {
  const { data } = useSWR("https://time1.olinfo.it/", fetcher, { suspense: true });

  return () => addMilliseconds(new Date(), data);

  async function fetcher(url: string) {
    const resp = await fetch(url);
    const localTime = Date.now();

    const text = await resp.text();
    const serverTime = Number(text);

    return serverTime - localTime;
  }
}
