import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

export const authOptions ={
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "user-top-read user-read-recently-played playlist-modify-public",
       },
     },
}),
  ],
 callbacks:{
    async jwt({ token, account }) {
        if (account) {
            token.accessToken = account.access_token
        }
        if (account) {
  token.accessToken = account.access_token;
  // fetch spotify user id
  const userRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${account.access_token}` },
  });
  const user = await userRes.json();
  token.spotifyUserId = user.id;
}  
        return token
    },
    async session({ session, token, user }) {
        session.accessToken = token.accessToken
        session.spotifyUserId = token.spotifyUserId;
        return session
    }
 }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };