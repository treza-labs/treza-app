/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Status color classes - ensure these are always included
    'bg-green-500/10', 'text-green-400', 'border-green-500/20',
    'bg-blue-500/10', 'text-blue-400', 'border-blue-500/20',
    'bg-yellow-500/10', 'text-yellow-400', 'border-yellow-500/20',
    'bg-orange-500/10', 'text-orange-400', 'border-orange-500/20',
    'bg-purple-500/10', 'text-purple-400', 'border-purple-500/20',
    'bg-red-500/10', 'text-red-400', 'border-red-500/20',
    'bg-gray-500/10', 'text-gray-400', 'border-gray-500/20',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        nacelle: ['Nacelle', 'sans-serif'],
      },
      colors: {
        gray: {
          950: '#0b0e19',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
