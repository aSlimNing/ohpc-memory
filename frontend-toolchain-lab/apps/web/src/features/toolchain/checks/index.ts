import type { Check } from "./types";
import { cryptoCheck, intlCheck, jitCheck, platformCheck, rafCheck, webglCheck } from "./runtime";
import { corsCheck, networkCheck, pollingCheck, storageCheck, workerCheck } from "./extras";

export const allChecks: Check[] = [
  platformCheck,
  intlCheck,
  jitCheck,
  webglCheck,
  cryptoCheck,
  rafCheck,
  workerCheck,
  storageCheck,
  networkCheck,
  corsCheck,
  pollingCheck,
];

export type { Check, CheckResult, CheckStatus } from "./types";
