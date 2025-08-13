const withMDX = require("@next/mdx")();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  // Configure allowed image domains
  images: {
    domains: ['d1olseq3j3ep4p.cloudfront.net'],
  },
  // Temporarily ignore TypeScript errors during build (ox package has internal TS errors)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optionally, add any other Next.js config below
};

module.exports = withMDX(nextConfig);
