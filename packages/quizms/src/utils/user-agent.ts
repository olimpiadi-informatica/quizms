import useSWR from "swr/immutable";
import { UAParser } from "ua-parser-js";
import { DeviceVendor } from "ua-parser-js/enums";

export function useUserAgent() {
  const { data } = useSWR("user-agent", getUserAgent, { suspense: true });

  const hasFullscreen = data.device.type == null || data.device.vendor !== DeviceVendor.APPLE;
  return { ...data, hasFullscreen };
}

async function getUserAgent() {
  const parser = new UAParser();
  const hintedResult = await parser.getResult().withClientHints();
  return hintedResult.withFeatureCheck();
}
