/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg1: '#1a1a1a',
        bg2: '#2d2d2d',
        bg3: '#3d3d3d',
        amber: '#d4a574',
        'amber-dark': '#c49464',
        red: '#b24545',
        'red-dark': '#922b2b',
        green: '#6b8e6b',
        text1: '#f0f0f0',
        text2: '#999999',
      },
    },
  },
  plugins: [],
}
