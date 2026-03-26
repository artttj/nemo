/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./entrypoints/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./utils/**/*.{ts,tsx,js,jsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      },
      colors: {
        base: {
          DEFAULT: '#0e0e12',
          surface: '#1a1a22',
          elevated: '#242430',
          hover: '#2e2e3a'
        },
        fg: {
          primary: '#f0f0f4',
          secondary: '#9898a8',
          muted: '#5e5e72',
          faint: '#32323e'
        },
        accent: {
          DEFAULT: '#7c6aef',
          hover: '#9484ff',
          muted: 'rgba(124, 106, 239, 0.12)',
          subtle: 'rgba(124, 106, 239, 0.06)'
        },
        glass: {
          border: 'rgba(255, 255, 255, 0.06)',
          'border-hover': 'rgba(255, 255, 255, 0.10)',
          'border-focus': 'rgba(124, 106, 239, 0.35)',
          surface: 'rgba(255, 255, 255, 0.03)',
          shine: 'rgba(255, 255, 255, 0.08)'
        },
        danger: '#e04545',
        warning: '#d4a020',
        success: '#3db86a'
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        full: '9999px'
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'grid-fade': 'gridFade 4s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" }
        },
        gridFade: {
          "0%, 100%": { opacity: "0.03" },
          "50%": { opacity: "0.07" }
        }
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
      },
      backgroundSize: {
        'grid': '32px 32px'
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'glass-hover': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glow': '0 0 40px rgba(124, 106, 239, 0.15)',
        'metallic': '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.3)'
      }
    }
  },
  plugins: []
}
