import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";
import type { Session, User } from "next-auth"
import type { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            username: string
            name?: string | null
            email?: string | null
            image?: string | null
        }
    }

    interface User {
        id: string
        username: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
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
                console.log("authorization")
                console.log(credentials);
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }
                console.log("validated credentials")
                const username = credentials.username;
                const password = credentials.password;

                const response = await axios.post(
                    `${process.env.BACKEND_URL}/api/login`,
                    {
                        username,
                        password,
                    },
                )
                console.log("response from db")
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