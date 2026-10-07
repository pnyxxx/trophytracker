import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Charte « roadbook de rallye » : fond brun nuit, crème, rouge,
 * titres Big Shoulders, texte Archivo, données en JetBrains Mono.
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
				sans: ['Archivo', 'system-ui', 'sans-serif'],
				display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
				stencil: ['"Big Shoulders Stencil Display"', '"Big Shoulders Display"', 'Impact', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
			},
			colors: {
				// Palette du design
				ink: {
					DEFAULT: '#120F0C', // fond principal
					950: '#0A0806', // pied de page
					900: '#1A1510', // fond des cartes
					800: '#1B1713', // cartes / panneaux
					700: '#2A221B', // avatars, surfaces
					600: '#3A322A', // bordures fortes
				},
				coal: '#1A1612', // texte sur fond clair
				cream: '#F4ECDF',
				sand: '#E9DCC8',
				paper: '#FFF8EC',
				ochre: '#D98A3D',
				gold: '#F2B45A',
				live: '#3DD68C',
				dust: {
					100: '#D9CDBD',
					200: '#C9BDAC',
					300: '#B3A796',
					400: '#9E9282',
					500: '#8C8176',
					600: '#6B6157',
					700: '#5A4E42',
					800: '#3A3027',
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
					dark: '#C23A33',
					light: '#F07A6E',
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
