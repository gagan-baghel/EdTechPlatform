/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // `remotePatterns`, not `domains` — the latter is deprecated, and dropping
    // three of these four hosts is what made every Unsplash/DiceBear image
    // throw "Invalid src prop" and take the homepage down with it.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // NOTE deliberately absent: `typescript.ignoreBuildErrors` and
  // `eslint.ignoreDuringBuilds`. Both were set to true, which switched off the
  // only gate that makes `next build` mean anything — a green build with them
  // on says nothing about whether the code typechecks. The tree is clean, so
  // the gate stays on.
}

module.exports = nextConfig
