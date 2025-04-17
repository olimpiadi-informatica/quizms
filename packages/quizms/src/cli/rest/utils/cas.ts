import urlJoin from "url-join";
import { error, info, success } from "~/utils/logs";

type ImportOptions = {
  verbose?: true;
  dryRun?: true;
  force?: true;
  token: string;
  authorization?: string;
  url: string;
};

export default async function cas(
  { dryRun, token, url }: ImportOptions,
  body: { old: any; new: any },
  collection: string,
): Promise<number> {
  const serializedBody = JSON.stringify(body, (_, v) => (typeof v === "bigint" ? Number(v) : v));
  const id = body.new.id;

  if (dryRun) {
    info(`Dry run: ${collection} ${id} would be imported.`);
    return 1;
  }
  const res = await fetch(urlJoin(url, `/admin/${collection}/cas`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `admin_token=${token}`,
    },
    body: serializedBody,
  });
  if (res.status !== 200) {
    error(`Failed to import ${collection} ${id}: ${res.statusText}`);
    return 0;
  }
  success(`Imported ${collection} ${id}.`);
  return 1;
}

export async function casRange(
  options: ImportOptions,
  token: string,
  range: { start: string; end: string },
) {
  if (options.verbose) {
    info(`Updating contest range for ${token} to ${range.start} - ${range.end} ...`);
    console.log(range);
  }
  if (options.dryRun) {
    info(`Dry run: ${token} range would be updated.`);
    return 1;
  }
  let res: Response;
  if (options.force) {
    res = await fetch(urlJoin(options.url, `/admin/student_data/set_range/${token}`), {
      method: "POST",
      headers: {
        Authorization: options.authorization!,
        "Content-Type": "application/json",
        cookie: `admin_token=${options.token}`,
      },
      body: JSON.stringify(range),
    });
  } else {
    res = await fetch(urlJoin(options.url, `/admin/student_data/cas_range/${token}`), {
      method: "POST",
      headers: {
        Authorization: options.authorization!,
        "Content-Type": "application/json",
        cookie: `admin_token=${options.token}`,
      },
      body: JSON.stringify({ new: range }),
    });
  }
  if (res.status !== 200) {
    error(`Failed to import contest range for ${token}: ${res.statusText}`);
    return 0;
  }
  success(`Updated contest range for ${token}.`);
  return 1;
}
