/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blush: {
          50: '#FDF9F9',
          100: '#FBF2F3',
          200: '#F6E2E4',
          300: '#ECC6CA',
          400: '#DFA3AA',
          500: '#CE7E89',
          600: '#B85E6A',
          700: '#9B4954',
          800: '#813E47',
          900: '#6D373F',
        },
        rosegold: {
          50: '#FAF5F4',
          100: '#F3E5E3',
          200: '#E8CEC8',
          300: '#D7AEA5',
          400: '#C58D82',
          500: '#B76E79',
          600: '#A15560',
          700: '#86434D',
          800: '#703A42',
          900: '#5F3339',
        },
        charcoal: {
          50: '#F8F9FA',
          100: '#EFF1F3',
          200: '#E1E4E8',
          300: '#C7CBD2',
          400: '#9CA2AE',
          500: '#717886',
          600: '#4D5462',
          700: '#343A46',
          800: '#23272F',
          900: '#15181E',
          950: '#0C0E12',
        },
        risk: {
          low: '#10B981',
          medium: '#D97706',
          high: '#EA580C',
          critical: '#E11D48',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(183, 110, 121, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.03)',
        'card': '0 10px 25px -3px rgba(197, 133, 137, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 14px 30px -4px rgba(183, 110, 121, 0.18), 0 6px 10px -4px rgba(0, 0, 0, 0.04)',
        'glow-rose': '0 0 25px -3px rgba(183, 110, 121, 0.25)',
      }
    },
  },
  plugins: [],
}
