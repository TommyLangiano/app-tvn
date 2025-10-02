import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			// Modern SaaS Design System
  			background: 'rgb(var(--bg) / <alpha-value>)',
  			surface: 'rgb(var(--surface) / <alpha-value>)',
  			foreground: 'rgb(var(--text) / <alpha-value>)',
  			border: 'rgb(var(--border) / <alpha-value>)',
  			primary: {
  				DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
  				foreground: 'rgb(var(--primary-foreground) / <alpha-value>)'
  			},
  			success: 'rgb(var(--success) / <alpha-value>)',
  			danger: 'rgb(var(--danger) / <alpha-value>)',
  			warning: 'rgb(var(--warning) / <alpha-value>)',
  			muted: {
  				DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
  				foreground: 'rgb(var(--muted) / <alpha-value>)'
  			},
  			// shadcn/ui compatibility
  			card: {
  				DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
  				foreground: 'rgb(var(--text) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
  				foreground: 'rgb(var(--text) / <alpha-value>)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 4px)',
  			sm: 'calc(var(--radius) - 8px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
