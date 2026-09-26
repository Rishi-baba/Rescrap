/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#0B2E23',
          700: '#14513C',
        },
        impact: {
          500: '#2FBF71',
          400: '#4FD68C',
        },
      },
    },
  },
  plugins: [],
};
