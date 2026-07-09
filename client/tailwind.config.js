/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        primaryHover: '#1D4ED8',
        primaryLight: '#DBEAFE',
        secondary: '#E2E8F0',
        accent: '#0EA5E9',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        pending: '#F97316',
        background: '#F8FAFC',
        backgroundSecondary: '#FFFFFF',
        backgroundSection: '#F1F5F9',
        text: '#0F172A',
        textSecondary: '#475569',
        textLight: '#94A3B8',
        border: '#E2E8F0',
        divider: '#CBD5E1',
        favorite: '#EC4899',
        premium: '#FBBF24',
        verified: '#06B6D4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        soft: '0 12px 40px rgba(15, 23, 42, 0.08)',
        premium: '0 20px 60px rgba(15, 23, 42, 0.15)',
      },
    },
  },
  plugins: [],
}
