import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

const [tracksRes, artistsRes, recentRes] = await Promise.all([
  fetch("https://api.spotify.com/v1/me/top/tracks?limit=15", {
  headers: {
    Authorization: `Bearer ${session.accessToken}`,
  },
}),
  fetch("https://api.spotify.com/v1/me/top/artists?limit=20", {
  headers: {
    Authorization: `Bearer ${session.accessToken}`,
  },
}),
  fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
  headers: {
    Authorization: `Bearer ${session.accessToken}`,
  },
})
]);

const [tracks, artists, recent] = await Promise.all([
  tracksRes.json(),
  artistsRes.json(),
  recentRes.json(),
]);

const tasteProfile = {
  topTracks: tracks.items.map((t: any) => ({
    name: t.name,
    artists: t.artists.map((a: any) => a.name),
  })),
  topArtists: artists.items.map((a: any) => a.name),
  recentTracks: recent.items.map((i: any) => ({
    name: i.track.name,
    artists: i.track.artists.map((a: any) => a.name),
  })),
};

const prompt = `
You are a music taste analyst. Based on this user's Spotify data, identify 3 underexplored dimensions of their taste and suggest artists they would likely enjoy but haven't discovered yet.

User's taste profile:
${JSON.stringify(tasteProfile, null, 2)}

Respond in this exact JSON format:
{
  "analysis": "2-3 sentence summary of their taste",
  "gaps": [
    {
      "dimension": "name of the underexplored direction",
      "reasoning": "why this fits their taste",
      "artists": ["artist1", "artist2", "artist3"]
    }
  ]
}
`;

const geminiRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  }
);

const geminiData = await geminiRes.json();
console.log(JSON.stringify(geminiData, null, 2));
const text = geminiData.candidates[0].content.parts[0].text;
const clean = text.replace(/```json|```/g, "").trim();
const result = JSON.parse(clean);

return NextResponse.json(result);

}