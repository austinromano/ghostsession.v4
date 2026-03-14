import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ghost: {
          bg: '#000000',
          surface: '#0A0A0F',
          'surface-light': '#0F0F18',
          'surface-hover': '#1A1A28',
          border: '#1E1E30',
          green: '#00FFC8',
          cyan: '#00B4D8',
          purple: '#5865F2',
          'online-green': '#23A559',
          'warning-amber': '#F0B232',
          'error-red': '#ED4245',
          'host-gold': '#F0B232',
          'text-primary': '#F2F3F5',
          'text-secondary': '#B5BAC1',
          'text-muted': '#6D6F78',
          'audio-track': '#5865F2',
          'midi-track': '#5865F2',
          'drum-track': '#ED4245',
          'loop-track': '#23A559',
          'waveform-bg': '#000000',
          'sidebar': '#0A0A0F',
          'sidebar-dark': '#050508',
        },
      },
      boxShadow: {
        'popup': '0 0 0 1px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.4)',
      },
      fontFamily: {
        sans: ['gg sans', 'Noto Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Consolas', 'Andale Mono WT', 'Andale Mono', 'monospace'],
      },
      borderRadius: {
        'lg': '8px',
        'xl': '12px',
      },
    },
  },
  plugins: [],
} satisfies Config;
