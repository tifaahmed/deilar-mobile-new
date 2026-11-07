import { describe, expect, it } from 'vitest';
import { appProgress } from '../utils/profileProgress';

describe('appProgress', () => {
  it('ignores email, job title and company', () => {
    const r = appProgress({ percent: 70, total: 10, missing: ['email', 'job_title', 'company_name'] });
    expect(r).toEqual({ percent: 100, missing: [], complete: true });
  });
  it('re-reads the percentage over the fields the app asks for', () => {
    const r = appProgress({ percent: 50, total: 10, missing: ['email', 'address', 'avatar', 'national_id', 'job_title'] });
    expect(r.missing).toEqual(['address', 'avatar', 'national_id']);
    expect(r.percent).toBe(57);
    expect(r.complete).toBe(false);
  });
});
