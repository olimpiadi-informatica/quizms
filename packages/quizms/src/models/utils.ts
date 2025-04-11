import path from "node:path";
import { uniq } from "lodash-es";
import picomatch from "picomatch";
import { Rng } from "~/utils";
import { fatal } from "~/utils/logs";
import type { Contest } from "./contest";
import load from "./load";
import type { Participation, School } from "./participation";
import { type VariantsConfig, variantsConfigSchema } from "./variants-config";

export async function getParticipations(
  contests: Contest[],
  schools: School[],
  teacherIds: { [key in string]: string },
) {
  let configs: VariantsConfig[] | undefined;
  const participations: Participation[] = [];
  for (const contest of contests) {
    for (const school of schools) {
      if (!picomatch.isMatch(contest.id, school.contestIds)) continue;

      let pdfVariants: string[] | undefined = undefined;
      if (contest.hasVariants) {
        if (school.pdfVariants) {
          pdfVariants = school.pdfVariants.map((id) => `${contest.id}-${id}`);
        } else {
          if (!configs) {
            configs = await load("variants", variantsConfigSchema);
          }
          const config = configs.find((c) => c.id === contest.id);
          if (!config) {
            fatal(`Missing variants configuration for contest ${contest.id}.`);
          }

          const rng = new Rng(`${config.secret}-${config.id}-${school.id}-participation`);
          pdfVariants = rng.sample(config.pdfVariantIds, config.pdfPerSchool);
        }
      }

      participations.push({
        id: `${school.id}-${contest.id}`,
        schoolId: school.id,
        contestId: contest.id,
        name: school.name,
        teacher: teacherIds[school.email],
        finalized: false,
        pdfVariants,
        disabled: false,
      });
    }
  }
  return participations;
}

export function getStatementsPaths(contests: Contest[], variantsConfig: VariantsConfig[]) {
  return contests.flatMap((contest) => {
    const config = variantsConfig.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }

    return uniq([...config.variantIds, ...config.pdfVariantIds]).map((id): [string, string] => [
      path.join("variants", config.id, `${id}.txt`),
      id,
    ]);
  });
}
