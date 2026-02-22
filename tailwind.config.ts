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
        bg: '#020204',
        panel: '#090c18',
        neon: '#48d6dc',
        magenta: '#dc44bc',
        gold: '#f4cf5b'
      },
      boxShadow: {
        glow: '0 0 24px rgba(72,214,220,.28)',
        magenta: '0 0 24px rgba(220,68,188,.22)'
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)'],
        cursive: ['var(--font-kaushan-script)']
      }
    }
  },
  plugins: []
};

export default config;
