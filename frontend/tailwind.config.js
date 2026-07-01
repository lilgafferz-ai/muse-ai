/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary purple palette
        muse: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#d9c2ff',
          300: '#c09aff',
          400: '#a778f8',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6824d6',
          800: '#5618b0',
          900: '#4a1390',
          950: '#2d0b60',
        },
        // Richer dark palette
        deep: {
          50:  '#f0ecff',
          100: '#e2d9ff',
          200: '#c8b5ff',
          300: '#a68aff',
          400: '#8462f4',
          500: '#6644e0',
          600: '#5030c4',
          700: '#3e21a8',
          800: '#1c1640',
          900: '#0f0a1e',
          950: '#080512',
        },
        // Void — pure black-purple
        void: {
          900: '#06040f',
          950: '#030208',
        },
        // Neural blue accent
        neural: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // Pulse pink accent
        pulse: {
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
        },
        // Surface tokens
        surface: {
          0: 'rgb(8, 5, 17)',
          1: 'rgb(14, 10, 28)',
          2: 'rgb(20, 15, 40)',
          3: 'rgb(28, 22, 55)',
          4: 'rgb(38, 32, 70)',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        xxs: ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      backdropBlur: {
        '4xl': '80px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '68': '17rem',
        '72': '18rem',
        '76': '19rem',
        '80': '20rem',
      },
      animation: {
        'fade-in':      'fade-in 0.25s ease-out',
        'slide-up':     'slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down':   'slide-down 0.25s ease-out',
        'scale-in':     'scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        'glow-pulse':   'glow-pulse 2.5s ease-in-out infinite',
        'breathe':      'breathe 4s ease-in-out infinite',
        'spin-slow':    'spin-slow 8s linear infinite',
        'shimmer':      'shimmer 1.8s infinite',
        'typing-dot':   'typing-bounce 1.4s infinite ease-in-out',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(139,92,246,0.2), 0 0 16px rgba(139,92,246,0.1)' },
          '50%':      { boxShadow: '0 0 20px rgba(139,92,246,0.45), 0 0 40px rgba(139,92,246,0.2)' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%':      { transform: 'scale(1.08)', opacity: '1' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'typing-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%':           { transform: 'translateY(-5px)', opacity: '1' },
        },
      },
      boxShadow: {
        'nexora':      '0 8px 32px rgba(0, 0, 0, 0.4)',
        'nexora-glow': '0 0 24px rgba(139, 92, 246, 0.25)',
        'nexora-lg':   '0 24px 80px rgba(0, 0, 0, 0.6)',
        'inner-glow':  'inset 0 0 20px rgba(139, 92, 246, 0.05)',
      },
    },
  },
  plugins: [],
}
