import { NextRequest, NextResponse } from "next/server";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const { username, password } = await req.json();

    const validUsername = process.env.ADMIN_USERNAME!;
    const validPassword = process.env.ADMIN_PASSWORD!;

    if (username !== validUsername || password !== validPassword) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken(username);
    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 8,
        path: "/",
    });

    return response;
}
