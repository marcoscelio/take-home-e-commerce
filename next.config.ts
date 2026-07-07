import type { NextConfig } from 'next'

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  eslint: { ignoreDuringBuilds: true },
}

export default config
