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
    outputFileTracingIncludes: {
      "/api/resume/convert-docx": [
        "./node_modules/docx-to-pdf-wasm/build/**",
      ],
    },
    serverComponentsExternalPackages: [
      "pdf-parse",
      "pdfjs-dist",
      "docx-to-pdf-wasm",
      "wink-nlp",
      "wink-eng-lite-web-model",
      "rake-js",
    ],
  },
  // pdfjs-dist is client-only; disable Node canvas/encoding shims that break webpack.
  // https://github.com/mozilla/pdf.js/issues/16214
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    // rake-js ships broken .js.map files that its dynamic require() context pulls in;
    // webpack tries to parse them as modules and fails. Ignore source maps so the
    // client bundle (v2 readiness scorer via AtsPanel) can include rake-js.
    config.module.rules.push({
      test: /\.js\.map$/,
      include: /node_modules[/\\]rake-js/,
      type: "asset/resource",
      generator: { emit: false },
    });
    if (isServer) {
      config.externals = [
        ...(config.externals ?? []),
        "docx-to-pdf-wasm",
        "wink-nlp",
        "wink-eng-lite-web-model",
        "rake-js",
      ];
    }
    return config;
  },
};

export default nextConfig;
