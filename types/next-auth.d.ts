import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

interface Session {
  accessToken?: string;
  spotifyUserId?: string;
}
interface JWT {
  accessToken?: string;
  spotifyUserId?: string;
}