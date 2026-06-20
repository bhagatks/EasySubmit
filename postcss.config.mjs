/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      config: "./config/tailwind.config.ts",
    },
  },
};

export default config;
