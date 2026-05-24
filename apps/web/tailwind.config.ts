import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EC',
        ink: '#0A0A0A',
        signal: '#FF4D1C',
        interrupt: '#1E40FF',
      },
      fontFamily: {
        display: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        brutal: '6px 6px 0 0 #0A0A0A',
        'brutal-sm': '2px 2px 0 0 #0A0A0A',
        'brutal-lg': '8px 8px 0 0 #0A0A0A',
        'brutal-orange': '6px 6px 0 0 #FF4D1C',
        'brutal-orange-sm': '2px 2px 0 0 #FF4D1C',
        'brutal-inverse': '6px 6px 0 0 #F5F2EC',
        'brutal-inverse-sm': '2px 2px 0 0 #F5F2EC',
      },
      borderRadius: {
        brutal: '4px',
      },
      transitionTimingFunction: {
        slam: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        'marquee-left': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-right': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        'pulse-signal': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'marquee-left': 'marquee-left 30s linear infinite',
        'marquee-right': 'marquee-right 30s linear infinite',
        'pulse-signal': 'pulse-signal 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
