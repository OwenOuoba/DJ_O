import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
  headers: {
    Authorization: `Bearer ${session.accessToken}`,
  },
});

const data = await response.json();
return NextResponse.json(data);
}