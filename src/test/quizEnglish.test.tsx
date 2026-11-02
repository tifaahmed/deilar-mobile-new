import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SECTIONS, EN_ID_OFFSET, sectionIn } from '../data/quizSections';
import { setQuizLang } from '../data/quizLanguage';
import { LanguageProvider } from '../context/LanguageContext';
import { QuizGame } from '../components/QuizGame';

const ARABIC = /[؀-ۿ]/;

describe.each(SECTIONS)('English questions of $id', (base) => {
  const en = sectionIn(base, 'en');

  it('has at least 1000 questions, all in English, in the same shape as the Arabic ones', () => {
    expect(en.questions.length).toBeGreaterThanOrEqual(1000);
    for (const q of en.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctAnswerIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctAnswerIndex).toBeLessThan(4);
      expect(q.difficulty).toBeGreaterThanOrEqual(1);
      expect(q.difficulty).toBeLessThanOrEqual(10);
      expect(`${q.question} ${q.options.join(' ')} ${q.explanation} ${q.category}`).not.toMatch(ARABIC);
    }
  });

  it('keeps its ids apart from the Arabic ones and never repeats a question', () => {
    const ids = en.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id > EN_ID_OFFSET)).toBe(true);
    expect(new Set(en.questions.map((q) => q.question)).size).toBe(en.questions.length);
  });

  it('covers easy and hard questions', () => {
    const levels = en.questions.map((q) => q.difficulty);
    expect(Math.min(...levels)).toBeLessThanOrEqual(2);
    expect(Math.max(...levels)).toBeGreaterThanOrEqual(8);
  });

  it('has an English title and keeps the backend key', () => {
    expect(en.title).not.toMatch(ARABIC);
    expect(en.introTitle).not.toMatch(ARABIC);
    expect(en.key).toBe(base.key);
  });
});

describe('the language question before the quiz', () => {
  afterEach(() => { cleanup(); setQuizLang(null); localStorage.clear(); });

  const open = (appLang: 'en' | 'ar') => {
    localStorage.setItem('deilar_language', appLang);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    return render(<LanguageProvider><QuizGame /></LanguageProvider>);
  };

  it('asks an English app which language the questions should be in', () => {
    open('en');
    expect(screen.getByTestId('quiz-language-choice')).toBeTruthy();
    expect(screen.getByText('English questions')).toBeTruthy();
    expect(screen.getByText(/Arabic questions/)).toBeTruthy();
  });

  it('goes on with the English sections after English is chosen', async () => {
    open('en');
    fireEvent.click(screen.getByText('English questions'));
    expect(screen.queryByTestId('quiz-language-choice')).toBeNull();
    expect(document.body.textContent).not.toMatch(/اختيار من متعدد/);
  });

  it('does not ask an Arabic app', () => {
    open('ar');
    expect(screen.queryByTestId('quiz-language-choice')).toBeNull();
  });
});
