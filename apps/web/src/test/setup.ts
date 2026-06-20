import '@testing-library/jest-dom/vitest';

// Tailwind uses darkMode: 'class' — add 'dark' so dark: variants render correctly in jsdom.
document.documentElement.classList.add('dark');
