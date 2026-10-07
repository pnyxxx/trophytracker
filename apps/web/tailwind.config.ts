import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Système d'identité « Balise » : nuit #15161A, surfaces « tableau de bord » #1F2026, crème #F5F1EA,
 * rouge « signal » #E1262C (actions, trace), vert « en direct » #3DBE7A (statut seulement), ambre « hors réseau ».
 * Titres Bricolage Grotesque, texte Atkinson Hyperlegible (17 px), données DM Mono.
 */
export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '1.75rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
				display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
				mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
			},
			colors: {
				// Palette « Balise »
				ink: {
					DEFAULT: '#15161A', // nuit : fond
					950: '#0E0F12', // le plus sombre (aperçus, barres latérales)
					900: '#111215', // barres latérales
					800: '#1F2026', // tableau de bord : surfaces, cartes
					700: '#2B2C33', // bordures, surfaces secondaires
					600: '#3A3B42', // bordures de champs
				},
				coal: '#15161A', // texte sur fond clair
				cream: '#F5F1EA', // texte principal, cartes claires
				sand: '#ECE7DE', // fond clair secondaire
				paper: '#FFFFFF',
				ochre: '#FF6B6B', // rouge « texte » (étiquettes, liens sur fond sombre)
				gold: '#E8A33D', // hors réseau
				'gold-text': '#F2C27A',
				live: '#3DBE7A', // en direct (statut uniquement)
				'live-text': '#7FE0AC',
				signal: { DEFAULT: '#E1262C', hover: '#F0484D', press: '#B81B20', text: '#FF6B6B', light: '#C41E24' },
				dust: {
					100: '#E4DFD6',
					200: '#D8D4CC',
					300: '#C9C5BD',
					400: '#A9A59D',
					500: '#8E8A83',
					600: '#6E6B65',
					700: '#5C5850',
					800: '#3A3832',
				},
				// Jetons shadcn/ui
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					dark: '#B81B20',
					light: '#F0484D',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 1px)',
				sm: 'calc(var(--radius) - 2px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				marquee: {
					from: { transform: 'translateX(0)' },
					to: { transform: 'translateX(-50%)' }
				},
				ping: {
					from: { transform: 'scale(1)', opacity: '0.8' },
					to: { transform: 'scale(2.6)', opacity: '0' }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				marquee: 'marquee 40s linear infinite',
				ping: 'ping 1.6s ease-out infinite',
			}
		}
	},
	plugins: [animate],
} satisfies Config;
