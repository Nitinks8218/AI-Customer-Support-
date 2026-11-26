/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        ink: {
          DEFAULT: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          rail: 'var(--bg-ink)'
        },
        border: 'var(--border-hairline)',
        accent: {
          DEFAULT: 'var(--accent-cobalt)',
          hover: 'var(--accent-cobalt-hover)',
          soft: 'var(--accent-cobalt-soft)'
        },
        emerald: {
          ops: 'var(--status-emerald)',
          soft: 'var(--status-emerald-soft)'
        },
        ochre: {
          ops: 'var(--status-ochre)',
          soft: 'var(--status-ochre-soft)'
        },
        crimson: {
          ops: 'var(--status-crimson)',
          soft: 'var(--status-crimson-soft)'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 26, 43, 0.05), 0 0 0 1px var(--border-hairline)',
        elevated: '0 10px 30px -10px rgba(18, 26, 43, 0.12), 0 0 0 1px var(--border-hairline)'
      }
    }
  },
  plugins: []
};
