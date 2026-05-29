/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-accent': '#3B82F6',
        'primary-glow': 'rgba(59, 130, 246, 0.5)',
        'danger-accent': '#EF4444',
        'danger-glow': 'rgba(239, 68, 68, 0.5)',
        'text-main': '#F8FAFC',
        'text-muted': '#94A3B8',
      }
    },
  },
  plugins: [],
}

