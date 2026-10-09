import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sindoor: { 50: '#fff1f0', 100: '#ffe0dc', 400: '#f2584a', 500: '#e0301e', 600: '#c0200f', 700: '#9a180b', 900: '#4a0c06' },
        marigold: { 300: '#ffd166', 400: '#ffbf3c', 500: '#f6a609', 600: '#d48806' },
        alta: '#d7263d',
        ink: { 900: '#1c0407', 800: '#2e0a10', 700: '#41121a' },
        // warm ivory/gold greys so text stays comfortable on the crimson background
        stone: { 50: '#fffaf0', 100: '#fff4e2', 200: '#fbe6c8', 300: '#f2d3ac', 400: '#e3bb92', 500: '#c9a07a', 600: '#a67c5b' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        alpana: 'radial-gradient(circle at 1px 1px, rgba(255,191,60,0.15) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
export default config;
