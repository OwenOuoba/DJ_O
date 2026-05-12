import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { message, history } = await request.json();

  // Fetch taste profile
  const [tracksRes, artistsRes] = await Promise.all([
    fetch("https://api.spotify.com/v1/me/top/tracks?limit=20", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }),
    fetch("https://api.spotify.com/v1/me/top/artists?limit=20", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }),
  ]);
  const [tracks, artists] = await Promise.all([tracksRes.json(), artistsRes.json()]);

  const tasteProfile = {
    topTracks: tracks.items.map((t: any) => ({ name: t.name, artists: t.artists.map((a: any) => a.name) })),
    topArtists: artists.items.map((a: any) => a.name),
  };

  const systemPrompt = `You are a music assistant with deep knowledge of the user's taste.

User's Spotify taste profile:
${JSON.stringify(tasteProfile, null, 2)}

You MUST always respond in this exact JSON format:
{
  "message": "your conversational response here",
  "action": "chat" | "create_playlist",
  "playlist": {
    "name": "playlist name",
    "tracks": ["track name - artist name"]
  }
}

"playlist" is only included when action is "create_playlist".
When creating playlists, suggest 10-15 tracks. Be specific with track and artist names.
For discovery requests, suggest artists outside their current taste but compatible with it.`;

  const geminiMessages = [
    ...(history || []),
    { role: "user", parts: [{ text: message }] }
  ];

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
      }),
    }
  );

  const geminiData = await geminiRes.json();
  const text = geminiData.candidates[0].content.parts[0].text;
  const clean = text.replace(/```json|```/g, "").trim();
  const result = JSON.parse(clean);

  // If playlist creation requested, search and create it
  if (result.action === "create_playlist" && result.playlist) {
    const trackUris: string[] = [];

    for (const trackQuery of result.playlist.tracks) {
      const searchRes = await fetch(
        `${process.env.NEXTAUTH_URL}/api/spotify/search?q=${encodeURIComponent(trackQuery)}`,
        { headers: { cookie: request.headers.get("cookie") || "" } }
      );
      const searchData = await searchRes.json();
      if (searchData.uri) trackUris.push(searchData.uri);
    }

    const createRes = await fetch(`${process.env.NEXTAUTH_URL}/api/spotify/create-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
      body: JSON.stringify({ name: result.playlist.name, trackUris, userId: session.spotifyUserId }),
    });
    const createData = await createRes.json();
    result.playlistUrl = createData.url;
  }

  return NextResponse.json({
    message: result.message,
    action: result.action,
    playlistUrl: result.playlistUrl || null,
  });
}