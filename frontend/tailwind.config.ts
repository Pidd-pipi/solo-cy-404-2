import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Atkinson Hyperlegible', 'Noto Sans SC', 'ui-sans-serif', 'system-ui'],
        display: ['Newsreader', 'Noto Serif SC', 'Georgia', 'serif'],
      },
      boxShadow: {
        panel: '0 18px 60px color-mix(in oklab, var(--shadow) 24%, transparent)',
      },
    },
  },
  plugins: [],
} satisfies Config;

