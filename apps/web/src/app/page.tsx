import { Button } from '@/components/ui/button'
import Link from "next/link"

export default function LandingPage() {
    // Todo : if session is avialable directly redirect to dashboard

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Navbar */}
            <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M20 8C18 8 16 10 16 12C16 14 18 16 20 16C22 16 24 14 24 12C24 10 22 8 20 8Z" fill="currentColor"/>
                            <rect x="15" y="16" width="10" height="3" fill="currentColor"/>
                            <path d="M14 19V26C14 28 16 30 20 30C24 30 26 28 26 26V19" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
                        </svg>
                        <span className="text-xl font-bold text-foreground hidden sm:inline">ChessMate</span>
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            className="border-border hover:bg-secondary/10 bg-transparent"
                        >
                            <Link href="/login">
                                Login
                            </Link>
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Link href="/signup">
                                Sign Up
                            </Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
                <div className="max-w-2xl w-full">
                    {/* Hero Section */}
                    <div className="text-center space-y-8">
                        {/* Chess Piece Icon */}
                        <div className="flex justify-center mb-6">
                            <svg className="w-20 h-20 sm:w-24 sm:h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2"/>
                                <path d="M50 15C46 15 40 18 40 24C40 30 46 38 50 38C54 38 60 30 60 24C60 18 54 15 50 15Z" fill="currentColor"/>
                                <rect x="38" y="38" width="24" height="6" fill="currentColor"/>
                                <path d="M35 44V65C35 72 40 78 50 78C60 78 65 72 65 65V44" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                            </svg>
                        </div>

                        {/* Title */}
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                                Play Chess Online
                            </h1>
                            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                Challenge players worldwide, test your strategy, and climb the rankings in real-time matches.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8"
                            >
                                Play Now
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 bg-transparent"
                            >
                                Watch Tutorial
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
