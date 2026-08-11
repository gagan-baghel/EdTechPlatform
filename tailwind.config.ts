/** @type {import('tailwindcss').Config} */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    fontFamily: {
      inter: ["Inter", "sans-serif"],
      "edu-sa": ["Edu SA Beginner", "cursive"],
      mono: ["Roboto Mono", "monospace"],
    },
    colors: {
      white: "#fff",
      black: "#000",
      transparent: "#ffffff00",
      // Values come from CSS custom properties (globals.css), not literal
      // hex — that's what lets Settings > Appearance flip every
      // richblack-* utility in the app between dark and light without
      // touching any component's className. rgb(var(..) / <alpha-value>)
      // is the standard Tailwind pattern for CSS-variable colors that
      // still support opacity modifiers (bg-richblack-800/50 etc).
      richblack: {
        5: "rgb(var(--richblack-5) / <alpha-value>)",
        25: "rgb(var(--richblack-25) / <alpha-value>)",
        50: "rgb(var(--richblack-50) / <alpha-value>)",
        100: "rgb(var(--richblack-100) / <alpha-value>)",
        200: "rgb(var(--richblack-200) / <alpha-value>)",
        300: "rgb(var(--richblack-300) / <alpha-value>)",
        400: "rgb(var(--richblack-400) / <alpha-value>)",
        500: "rgb(var(--richblack-500) / <alpha-value>)",
        600: "rgb(var(--richblack-600) / <alpha-value>)",
        700: "rgb(var(--richblack-700) / <alpha-value>)",
        800: "rgb(var(--richblack-800) / <alpha-value>)",
        900: "rgb(var(--richblack-900) / <alpha-value>)",
      },
      // Fixed regardless of theme — text sitting on an accent surface
      // (buttons, badges) that doesn't itself change between themes.
      // See globals.css's comment on --ink/--paper for why these exist
      // instead of just using richblack-900/richblack-5 for this.
      ink: "rgb(var(--ink) / <alpha-value>)",
      paper: "rgb(var(--paper) / <alpha-value>)",
      richblue: {
        5: "#ECF5FF",
        25: "#C6D6E1",
        50: "#A0B7C3",
        100: "#7A98A6",
        200: "#537988",
        300: "#2D5A6A",
        400: "#073B4C",
        500: "#063544",
        600: "#042E3B",
        700: "#032833",
        800: "#01212A",
        900: "#001B22",
      },
      blue: {
        5: "#EAF5FF",
        25: "#B4DAEC",
        50: "#7EC0D9",
        100: "#47A5C5",
        200: "#118AB2",
        300: "#0F7A9D",
        400: "#0C6A87",
        500: "#0A5A72",
        600: "#074B5D",
        700: "#053B48",
        800: "#022B32",
        900: "#001B1D",
      },
      caribbeangreen: {
        5: "#C1FFFD",
        25: "#83F1DE",
        50: "#44E4BF",
        100: "#06D6A0",
        200: "#05BF8E",
        300: "#05A77B",
        400: "#049069",
        500: "#037957",
        600: "#026144",
        700: "#014A32",
        800: "#01321F",
        900: "#001B0D",
      },
      brown: {
        5: "#FFF4C4",
        25: "#FFE395",
        50: "#FFD166",
        100: "#E7BC5B",
        200: "#CFA64F",
        300: "#B89144",
        400: "#A07C39",
        500: "#88662D",
        600: "#705122",
        700: "#593C17",
        800: "#41260B",
        900: "#291100",
      },
      pink: {
        5: "#FFF1F1",
        25: "#FBC7D1",
        50: "#F79CB0",
        100: "#F37290",
        200: "#EF476F",
        300: "#D43D63",
        400: "#BA3356",
        500: "#9F294A",
        600: "#841E3E",
        700: "#691432",
        800: "#4F0A25",
        900: "#340019",
      },
      yellow: {
        5: "#FFF970",
        25: "#FFE83D",
        50: "#FFD60A",
        100: "#E7C009",
        200: "#CFAB08",
        300: "#B69507",
        400: "#9E8006",
        500: "#866A04",
        600: "#6E5503",
        700: "#553F02",
        800: "#3D2A01",
        900: "#251400",
      },
      "pure-greys": {
        5: "#F9F9F9",
        25: "#E2E2E2",
        50: "#CCCCCC",
        100: "#B5B5B5",
        200: "#9E9E9E",
        300: "#888888",
        400: "#717171",
        500: "#5B5B5B",
        600: "#444444",
        700: "#2D2D2D",
        800: "#171717",
        900: "#141414",
      },
    },
    extend: {
      maxWidth: {
        maxContent: "1260px",
        maxContentTab: "650px",
      },
    },
  },
  plugins: [],
}

export default config;
