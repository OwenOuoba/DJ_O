import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query!)}&type=track&limit=1`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const data = await res.json();
  const track = data.tracks.items[0];
  return NextResponse.json({ id: track?.id, name: track?.name, uri: track?.uri });
}