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
        bg: '#070809',
        panel: '#111315',
        neon: '#c5a867',
        magenta: '#6f1a23',
        gold: '#d0b173'
      },
      boxShadow: {
        glow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 0 0 1px rgba(255,255,255,0.05), 0 10px 24px rgba(0,0,0,0.42)',
        magenta: 'inset 0 1px 0 rgba(255,255,255,0.015), 0 0 0 1px rgba(255,255,255,0.05), 0 14px 30px rgba(0,0,0,0.48)'
      },
      fontFamily: {
        sans: ['Avenir Next', 'SF Pro Display', 'Inter', 'Segoe UI', 'sans-serif'],
        cursive: ['Kaushan Script', 'Brush Script MT', 'Lucida Handwriting', 'cursive']
      }
    }
  },
  plugins: []
};

export default config;
