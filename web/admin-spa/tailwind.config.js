/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 扩展圆角（现代扁平设计）
      borderRadius: {
        '4xl': '2rem',    // 32px
        '5xl': '2.5rem',  // 40px
        '6xl': '3rem',    // 48px
      },

      // 扩展颜色
      colors: {
        primary: {
          50: '#e6faf4',
          100: '#ccf5e9',
          200: '#99ebd3',
          300: '#66e1bd',
          400: '#33d7a7',
          500: '#00da90',  // RGB(0, 218, 144)
          600: '#00ae73',
          700: '#008256',
          800: '#00573a',
          900: '#002b1d',
        },
      },

      // 扩展阴影
      boxShadow: {
        'glow': '0 0 15px rgba(0, 218, 144, 0.15)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },

      // 扩展动画
      animation: {
        gradient: 'gradient 8s ease infinite',
        float: 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
      },

      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
