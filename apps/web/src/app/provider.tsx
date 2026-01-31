'use client';
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider as NextThemesProvider } from "next-themes"
import {RecoilRoot} from "recoil"

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <SessionProvider>
            <NextThemesProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem={false}
                disableTransitionOnChange
            >
                <RecoilRoot>
                    {children}
                </RecoilRoot>
            </NextThemesProvider>
        </SessionProvider>
    );
};