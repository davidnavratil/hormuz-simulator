// Konfigurace převzatá z původního inline bloku Tailwind Play CDN (index.html), 22. 11. 2026.
module.exports = {
  content: ['./index.html', './en/index.html', './app.js', './translations.js'],
      theme: {
        extend: {
          fontFamily: {
            serif: ['Fraunces', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
            sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
            mono: ['"SF Mono"', '"Fira Code"', '"Fira Mono"', 'Menlo', 'monospace'],
          },
          colors: {
            brand: {
              bg: '#F5F1E8',
              card: '#FFFFFF',
              text: '#1E293B',
              gray: '#94A3B8',
              orange: '#B45309',
              red: '#DC2626',
              green: '#22C55E',
              blue: '#11457E',
              dark: '#1A1D23',
              line: '#E2E8F0',
            }
          },
          maxWidth: {
            content: '1200px',
          },
          gridTemplateColumns: {
            '20': 'repeat(20, minmax(0, 1fr))',
          }
        }
      }
};
