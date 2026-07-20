import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Discordのアバター画像（OAuthログイン後のプロフィール表示用、変更前の初期値として使う）
      { protocol: "https", hostname: "cdn.discordapp.com" },
      // Supabase Storageの公開URL（村民が変更したプロフィール画像用）
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
