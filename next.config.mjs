/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "pdfjs-dist",
      "docx-to-pdf-wasm",
    ],
  },
  // pdfjs-dist is client-only; disable Node canvas/encoding shims that break webpack.
  // https://github.com/mozilla/pdf.js/issues/16214
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    if (isServer) {
      config.externals = [...(config.externals ?? []), "docx-to-pdf-wasm"];
    }
    return config;
  },
};

export default nextConfig;
