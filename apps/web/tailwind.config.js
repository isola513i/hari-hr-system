/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./lib/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                "primary": "#3498db",
                "primary-dark": "#2c3e50",
                "primary-hover": "#2980b9",
                "background-light": "#f8f9fa",
                "background-dark": "#101922",
                "text-light": "#2c3e50",
                "text-dark": "#f8f9fa",
                "text-muted-light": "#617589",
                "text-muted-dark": "#a0aec0",
                "border-light": "#e2e8f0",
                "border-dark": "#2d3748",
                "card-light": "#ffffff",
                "card-dark": "#1a202c",
                "accent-teal": "#1abc9c",
                "accent-green": "#2ecc71",
                "accent-orange": "#f39c12",
                "accent-red": "#e74c3c"
            },
            fontFamily: {
                "sans": ["Inter", "sans-serif"]
            }
        },
    },
    plugins: [],
}
