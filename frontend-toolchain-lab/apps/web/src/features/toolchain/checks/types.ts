export type CheckStatus = "pass" | "fail" | "skip";

export interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  ms: number;
}

export interface Check {
  id: string;
  title: string;
  run: () => Promise<string>;
}
