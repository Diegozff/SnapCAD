/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Palette sampled from the SnapCAD logo.
        navy: {
          900: "#0E2438",
          800: "#122E4A",
          700: "#163A5C",
          600: "#1E4D75",
        },
        brand: {
          700: "#1F5FA0",
          600: "#2569B0",
          500: "#2D7DD2",
          400: "#3D92E0",
          300: "#5BA8E8",
          200: "#8FC7F0",
        },
        blueprint: {
          bg: "#0E2A44",
          grid: "#1C4368",
          line: "#BFE0F5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
