import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#050509',
        panel: '#0d1020',
        neon: '#5cf9ff',
        magenta: '#ff4dd9',
        gold: '#f4cf5b'
      },
      boxShadow: {
        glow: '0 0 24px rgba(92,249,255,.35)',
        magenta: '0 0 24px rgba(255,77,217,.25)'
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)'],
        cursive: ['var(--font-kaushan-script)']
      }
    }
  },
  plugins: []
};

export default config;
