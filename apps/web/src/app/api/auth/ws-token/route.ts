import { getServerSession } from "next-auth";
import { NEXT_AUTH_CONFIG } from "@/lib/auth";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(NEXT_AUTH_CONFIG);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const token = await new SignJWT({ id: session.user.id, username: session.user.username })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("2m")
        .sign(secret);

    return NextResponse.json({ token });
}
