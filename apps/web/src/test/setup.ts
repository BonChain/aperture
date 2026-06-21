import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// Extend vitest's expect with jest-dom matchers (toHaveAttribute, toHaveTextContent, etc.).
// Using expect.extend(matchers) directly avoids an instance-isolation issue with the
// @testing-library/jest-dom/vitest barrel that can cause "Invalid Chai property" errors
// when vitest runs tests in an isolated jsdom worker.
expect.extend(jestDomMatchers);

// Tailwind uses darkMode: 'class' — add 'dark' so dark: variants render correctly in jsdom.
document.documentElement.classList.add('dark');
