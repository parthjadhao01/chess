'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfileDialog } from '@/components/profile-dialog';

export function UserMenu() {
  const { data: session } = useSession();
  const username = session?.user?.username ?? 'You';
  const initial = username[0]?.toUpperCase() ?? 'Y';
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-9 border border-border">
              <AvatarFallback className="bg-emerald-500/20 text-emerald-400 font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="truncate">{username}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              // close the dropdown first, then open the dialog — otherwise
              // Radix's focus-return fights the dialog's focus-trap and the
              // dropdown is left rendered underneath the dialog overlay.
              setMenuOpen(false);
              setTimeout(() => setProfileOpen(true), 0);
            }}
          >
            <User className="size-4" />
            See Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
