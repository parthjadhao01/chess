'use client';

import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({
                                   message = 'Matching the perfect opponent...',
                                   size = 'md'
                               }: LoadingSpinnerProps) {
    const dotSizeClasses = {
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-2.5 h-2.5',
    };

    const messageSizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const gapClasses = {
        sm: 'gap-1.5',
        md: 'gap-2',
        lg: 'gap-2.5',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            {/* Animated dots */}
            <div className={`flex ${gapClasses[size]} items-center justify-center`}>
                <div className={`${dotSizeClasses[size]} bg-foreground rounded-full animate-bounce`} style={{ animationDelay: '0s' }} />
                <div className={`${dotSizeClasses[size]} bg-foreground rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }} />
                <div className={`${dotSizeClasses[size]} bg-foreground rounded-full animate-bounce`} style={{ animationDelay: '0.4s' }} />
            </div>

            {/* Message */}
            {message && (
                <p className={`${messageSizeClasses[size]} text-muted-foreground text-center font-medium`}>
                    {message}
                </p>
            )}
        </div>
    );
}
