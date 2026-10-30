/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#090d12",
          panel: "#121820",
          card: "#1a232e",
          border: "#2a3644",
          text: "#f0f4f8",
          muted: "#8a99ad",
        },
        accent: {
          health: "#10b981",  // Neon Emerald
          wealth: "#06b6d4",  // Neon Cyan
          social: "#a855f7",  // Neon Purple
          ai: "#f43f5e",      // Glowing Coral
        }
      },
      fontFamily: {
        sans: ["Outfit", "Plus Jakarta Sans", "Nunito", "Inter", "sans-serif"],
        mono: ["Outfit", "Plus Jakarta Sans", "JetBrains Mono", "monospace"],
        code: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(244, 63, 94, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      }
    },
  },
  plugins: [],
};
