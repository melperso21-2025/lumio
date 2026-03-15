import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        syne:    ['var(--font-syne)', 'sans-serif'],
        jakarta: ['var(--font-jakarta)', 'sans-serif'],
      },
      colors: {
        gold:    '#E8A500',
        amber:   '#F09A1A',
        lumio: {
          bg:      '#F7F8FC',
          surface: '#FFFFFF',
          border:  '#E4E6F0',
          text:    '#1A1B2E',
          text2:   '#4A4D6A',
          muted:   '#9294AC',
        }
      },
    },
  },
  plugins: [],
}

export default config
