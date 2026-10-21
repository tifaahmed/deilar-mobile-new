import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('deilar_language', 'en');
});

afterEach(() => cleanup());
