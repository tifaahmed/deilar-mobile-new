import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn() }));
vi.mock('../api/http', () => ({ apiPost: http.apiPost, ApiError: class ApiError extends Error { constructor(m: string, readonly status: number) { super(m); } } }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { flushQuizAnswers, getQueue, recordQuizAnswer } from '../utils/quizStore';
import { clearSession, updateSession } from '../utils/session';

const answer = (correct: boolean) => ({ play_id: 'p1', quiz: 'mcq:football', question_id: 1, correct, timed_out: false, stage: 1 });

describe('quiz answer queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it('keeps answers on the phone while nobody is signed in, and sends nothing', async () => {
    recordQuizAnswer(answer(true));
    recordQuizAnswer(answer(false));
    await flushQuizAnswers();

    expect(getQueue()).toHaveLength(2);
    expect(http.apiPost).not.toHaveBeenCalled();
  });

  it('keeps them when the upload fails (offline), and sends them once signed in and back online', async () => {
    updateSession({ token: 'tok' });
    recordQuizAnswer(answer(true));

    http.apiPost.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await flushQuizAnswers();
    expect(getQueue()).toHaveLength(1);

    http.apiPost.mockResolvedValueOnce({ data: { points: 10 } });
    await flushQuizAnswers();
    expect(getQueue()).toHaveLength(0);

    const [path, body, , token] = http.apiPost.mock.calls[1];
    expect(path).toBe('/loyalty/quiz-answers');
    expect(token).toBe('tok');
    expect(body.answers).toHaveLength(1);
    expect(body.answers[0].id).toBeTruthy();
  });

  it('sends in batches of 100', async () => {
    updateSession({ token: 'tok' });
    for (let i = 0; i < 130; i++) recordQuizAnswer(answer(true));
    http.apiPost.mockResolvedValue({ data: { points: 1300 } });
    await flushQuizAnswers();

    expect(http.apiPost.mock.calls.map((c) => c[1].answers.length)).toEqual([100, 30]);
    expect(getQueue()).toHaveLength(0);
  });
});
