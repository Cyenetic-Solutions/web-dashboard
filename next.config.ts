import type { NextConfig } from 'next';
// The app renders plain <img> tags, so the /_next/image optimizer is turned off; it was the entry point of a past critical advisory.
const config: NextConfig = { output: 'standalone', poweredByHeader: false, devIndicators: false, images: { unoptimized: true } };
export default config;
