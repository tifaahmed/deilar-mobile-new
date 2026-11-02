import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn() }));
vi.mock('../api/http', () => ({ apiPost: http.apiPost, ApiError: class ApiError extends Error { constructor(m: string, readonly status: number) { super(m); } } }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { renderHook, act } from '@testing-library/react';
import { flushQuizAnswers, getQueue, previewSignIn, quizPoints, recordQuizAnswer, useQueuedPlayIds } from '../utils/quizStore';
import { clearSession, updateSession } from '../utils/session';

const answer = (correct: boolean) => ({ play_id: 'p1', quiz: 'mcq:football', question_id: 1, correct, timed_out: false, seconds: 1, stage: 1 });

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

  it('deletes answers played under another account when someone else signs in, and keeps a guest\'s and its own', async () => {
    updateSession({ token: 'a', cardNumber: '111111' });
    recordQuizAnswer(answer(true)); // played as account A
    clearSession();
    recordQuizAnswer(answer(true)); // played as a guest
    updateSession({ token: 'b', cardNumber: '222222' });
    recordQuizAnswer(answer(false)); // played as account B

    http.apiPost.mockResolvedValue({ data: { points: 0 } });
    await flushQuizAnswers();

    const sent = http.apiPost.mock.calls[0][1].answers;
    expect(sent).toHaveLength(2); // the guest's + B's own; A's is gone from the phone
    expect(sent.every((a: { owner?: unknown }) => a.owner === undefined)).toBe(true);
    expect(getQueue()).toHaveLength(0);
  });

  it('tells beforehand what signing in would add and what it would delete', () => {
    updateSession({ token: 'a', cardNumber: '111111' });
    recordQuizAnswer(answer(true)); // account A
    clearSession();
    recordQuizAnswer(answer(true));
    recordQuizAnswer(answer(false)); // guest: +100, and a wrong answer costs nothing by default

    expect(previewSignIn({ card: '222222' })).toEqual({ move: { answers: 2, points: 100 }, remove: { answers: 1, points: 100 } });
    expect(previewSignIn({ card: '111111' }).remove.answers).toBe(0);
  });

  it('names the plays that still wait on the phone, and drops them once the backend has accepted the answers', async () => {
    updateSession({ token: 'tok' });
    recordQuizAnswer(answer(true));
    const { result } = renderHook(() => useQueuedPlayIds());
    expect(result.current.has('p1')).toBe(true);

    http.apiPost.mockResolvedValueOnce({ data: { points: 10 } });
    await act(async () => { await flushQuizAnswers(); });
    expect(result.current.has('p1')).toBe(false);
  });

  it('pays a right answer by speed (5 s = 100, 10 s = 75, 15 s = 50, 20 s = 25) and charges nothing for a wrong one', () => {
    expect([0, 4.9, 5].map((s) => quizPoints(true, s))).toEqual([100, 100, 100]);
    expect([5.1, 8, 10].map((s) => quizPoints(true, s))).toEqual([75, 75, 75]);
    expect([10.5, 15].map((s) => quizPoints(true, s))).toEqual([50, 50]);
    expect([15.1, 19.9, 20, 99].map((s) => quizPoints(true, s))).toEqual([25, 25, 25, 25]);
    expect(quizPoints(true)).toBe(25);
    expect([quizPoints(false, 1), quizPoints(false)]).toEqual([0, 0]);
  });

  it('scores with the rules the backend last sent, kept on the phone, so the game plays the same offline', () => {
    localStorage.setItem('deilar_quiz_rules', JSON.stringify({ points_wrong: -7, speed_tiers: [{ up_to_seconds: 10, points: 40 }, { up_to_seconds: 20, points: 10 }] }));
    expect([quizPoints(false, 1), quizPoints(false)]).toEqual([-7, -7]);
    expect([quizPoints(true, 3), quizPoints(true, 12), quizPoints(true)]).toEqual([40, 10, 10]);

    // a positive number can never become a reward for a wrong answer
    localStorage.setItem('deilar_quiz_rules', JSON.stringify({ points_wrong: 5 }));
    expect(quizPoints(false)).toBe(0);
  });
});
