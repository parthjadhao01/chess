import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";
import {BACKEND_URL} from "@/config";
import {DefaultSession, Session, User} from "next-auth"
import {DefaultJWT, JWT} from "next-auth/jwt"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            username: string
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        username: string
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string
        username: string
    }
}

export const NEXT_AUTH_CONFIG = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: 'email', type: 'text', placeholder: '' },
                password: { label: 'password', type: 'password', placeholder: '' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const username = credentials.username;
                const password = credentials.password;

                const response = await axios.post(
                    `${process.env.BACKEND_URL}/api/login`,
                    {
                        username,
                        password,
                    },
                )

                if (response.status !== 200) {
                    return null
                }

                console.log(response.data)
                return {
                    id : response.data.data.id,
                    username : response.data.data.username
                };
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        })
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({user,token } : {user : User, token : JWT}) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
            }
            return token;
        },
        async session({ session, token } : {session : Session , token : JWT}) {
            if (session.user && token){
                session.user.id = token.id
                session.user.username = token.username;
            }
            return session;
        }
    },
    page : {
        signin : "/login"
    }
}