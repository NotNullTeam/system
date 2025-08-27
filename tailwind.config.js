/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 保留 brand.* 以兼容自定义用法
        brand: {
          blue: '#007DFF',
          green: '#00C487',
          yellow: '#FFC300',
          red: '#FF3131',
        },
        // 覆盖 Tailwind 默认调色板，使用原型中的品牌色阶
        blue: {
          50:  '#E8F3FF',
          100: '#DCEEFF',
          200: '#B3D8FF',
          300: '#8AC2FF',
          400: '#62ABFF',
          500: '#007DFF',
          600: '#0061CC',
          700: '#004699',
          800: '#002C66',
          900: '#001333',
        },
        green: {
          50:  '#E6F9F3',
          100: '#CCF3E7',
          200: '#99E7CF',
          300: '#66DBB7',
          400: '#33CF9F',
          500: '#00C487',
          600: '#00A06B',
          700: '#007C50',
          800: '#005836',
          900: '#00341B',
        },
        yellow: {
          50:  '#FFFBE6',
          100: '#FFF6CC',
          200: '#FFE999',
          300: '#FFDC66',
          400: '#FFD033',
          500: '#FFC300',
          600: '#CC9C00',
          700: '#997400',
          800: '#664D00',
          900: '#332600',
        },
        red: {
          50:  '#FFECEC',
          100: '#FFD9D9',
          200: '#FFAFAF',
          300: '#FF8585',
          400: '#FF5B5B',
          500: '#FF3131',
          600: '#CC2828',
          700: '#991F1F',
          800: '#661515',
          900: '#330B0B',
        },
      },
      fontFamily: {
        // 将 HarmonyOS 字体加入到首选字体族
        sans: ['"HarmonyOS Sans SC"', '"HarmonyOS Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', 'Arial', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'],
      },
    },
  },
  plugins: [],
};
