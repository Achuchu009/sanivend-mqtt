import crypto from 'crypto';

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  env: {
    SERVER_RUN_ID: crypto.randomUUID()
  }
};

export default nextConfig;
