/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Override slate and white to be theme-aware via CSS variables (RGB channels)
        slate: {
          50: 'rgb(var(--slate-50) / <alpha-value>)',
          100: 'rgb(var(--slate-100) / <alpha-value>)',
          200: 'rgb(var(--slate-200) / <alpha-value>)',
          300: 'rgb(var(--slate-300) / <alpha-value>)',
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: 'rgb(var(--slate-500) / <alpha-value>)',
          600: 'rgb(var(--slate-600) / <alpha-value>)',
          700: 'rgb(var(--slate-700) / <alpha-value>)',
          800: 'rgb(var(--slate-800) / <alpha-value>)',
          900: 'rgb(var(--slate-900) / <alpha-value>)',
        },
        white: 'rgb(var(--content-strong) / <alpha-value>)',
        // Genie semantic colours (F2). `bone` = card surface (not `card`, which
        // would collide with the existing shadow-card utility); `sky` merges into
        // Tailwind's sky palette as its DEFAULT so sky-50…900 keep working.
        sky: { DEFAULT: '#ebf5ff' },
        bone: '#fafdff',
        paper: '#ffffff',
        mist: '#f6f7f8',
        charcoal: '#181d27',
        graphite: '#535862',
        fog: '#93979f',
        line: '#dde8f5',
        iris: { DEFAULT: '#0069e0', hi: '#479dff' },
        lav: '#f1e6ff',
        mint: '#d3f6e3',
        powder: '#cce7ff',
        solar: '#fff2be',
        peach: '#ffe2d1',
        ink: {
          DEFAULT: '#0a0d12',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
        },
        accent: {
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
          800: 'rgb(var(--accent-800) / <alpha-value>)',
          900: 'rgb(var(--accent-900) / <alpha-value>)',
        },
        signal: {
          green: 'rgb(var(--signal-green) / <alpha-value>)',
          amber: 'rgb(var(--signal-amber) / <alpha-value>)',
          rose: 'rgb(var(--signal-rose) / <alpha-value>)',
          violet: 'rgb(var(--signal-violet) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Geist Variable', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Geist Variable', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['Geist Mono Variable', 'Geist Mono', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '32px',
        img: '24px',
        input: '16px',
      },
      boxShadow: {
        glow: '0 0 0 1px var(--glow-border)',
        card: '0 1px 0 0 var(--card-inner) inset, 0 1px 24px -12px var(--card-shadow)',
        float: '0 14px 20px 4px rgba(4, 69, 144, .08)',
        btn: '0 1px 2px rgba(10, 13, 18, .8), 0 0 0 1px #0a0d12',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.16, 1, .3, 1)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.92)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'chip-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.8)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'chip-out': {
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        'char-in': {
          '0%': { opacity: '0', filter: 'blur(6px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        'avatar-in': {
          '0%': { opacity: '0', transform: 'scale(0.75) rotateY(-70deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotateY(0)' },
        },
        'stage-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.2,0.9,0.3,1.2) both',
        'chip-in': 'chip-in 0.35s cubic-bezier(0.2,0.9,0.3,1.3) both',
        'chip-out': 'chip-out 0.16s ease forwards',
        'char-in': 'char-in 0.4s ease both',
        'avatar-in': 'avatar-in 0.7s cubic-bezier(0.2,0.9,0.25,1) both',
        'stage-in': 'stage-in 0.7s cubic-bezier(0.2,0.8,0.2,1) both',
      },
    },
  },
  plugins: [],
};
