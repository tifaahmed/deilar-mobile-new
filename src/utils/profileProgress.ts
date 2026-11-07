/**
 * The app does not ask for e-mail, job title or company name (company is an optional
 * "your company" box), so they never count as "missing" here. The backend still counts them
 * (the website asks for them), so the app drops them from the list and re-reads the percentage
 * over the remaining fields. Nothing else is computed here.
 */
export const APP_IGNORED_FIELDS = ['email', 'job_title', 'company_name'];

export interface ProgressInput { percent: number; missing: string[]; total?: number }
export interface AppProgress { percent: number; missing: string[]; complete: boolean }

export function appProgress(p: ProgressInput): AppProgress {
  const missing = p.missing.filter((k) => !APP_IGNORED_FIELDS.includes(k));
  if (!p.total) {
    return { percent: missing.length === 0 ? 100 : p.percent, missing, complete: missing.length === 0 };
  }
  const total = p.total - APP_IGNORED_FIELDS.length;
  const percent = total <= 0 ? 100 : Math.round(((total - missing.length) / total) * 100);
  return { percent, missing, complete: missing.length === 0 };
}
