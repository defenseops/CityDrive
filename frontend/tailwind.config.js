/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg:      '#07070f',
          surface: '#0e0e1a',
          card:    '#13131f',
          border:  '#1e1e30',
          hover:   '#1a1a28',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.45s ease forwards',
        'slide-up-d': 'slideUp 0.45s ease 0.1s forwards',
        'slide-up-d2':'slideUp 0.45s ease 0.2s forwards',
        'slide-up-d3':'slideUp 0.45s ease 0.3s forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spin-slow':  'spin 1.2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
          '50%':     { boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(79,70,229,0.1) 0%, rgba(124,58,237,0.05) 100%)',
      },
    },
  },
  plugins: [],
};
