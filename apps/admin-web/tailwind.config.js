/**
 * Plain ESM config on purpose.
 *
 * A `tailwind.config.ts` is loaded through jiti, which breaks under this
 * pnpm/Node combination with a confusing "Cannot read properties of
 * undefined". Keeping it as a .js file removes that whole transform path.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
