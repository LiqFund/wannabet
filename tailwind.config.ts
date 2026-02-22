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
        bg: '#0B0D10',
        panel: '#111418',
        neon: '#C6A75E',
        magenta: '#B3122D',
        gold: '#D7B76F'
      },
      boxShadow: {
        glow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.06)',
        magenta: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.06)'
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
