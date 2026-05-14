import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
export const COOKIE_NAME = "admin_token";
const EXPIRES_IN = "8h";

export async function signToken(username: string): Promise<string> {
    return new SignJWT({ username })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(EXPIRES_IN)
        .sign(SECRET);
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as { username: string };
    } catch {
        return null;
    }
}
