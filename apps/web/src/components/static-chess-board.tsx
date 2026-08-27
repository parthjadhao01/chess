'use client';

import Image from 'next/image';
import { Chess } from 'chess.js';

// Same starting position, and the same square classes (w-36 h-36 sm:w-14 sm:h-14)
// the board renders at during an actual game — see play/[gameId]/chessBoard.tsx.
const START_BOARD = new Chess().board();

export function StaticChessBoard({
  squareClassName = 'w-36 h-36 sm:w-14 sm:h-14',
}: {
  squareClassName?: string;
}) {
  return (
    <div className="select-none">
      {START_BOARD.map((row, i) => (
        <div key={i} className="flex">
          {row.map((square, j) => {
            const isLight = (i + j) % 2 === 0;
            return (
              <div
                key={j}
                className={`${squareClassName} flex items-center justify-center ${isLight ? 'bg-foreground/10' : 'bg-foreground/30'
                  }`}
              >
                {square && (
                  <Image
                    width={50}
                    height={50}
                    alt={square.square}
                    className="w-[4.25rem]"
                    src={`/${square.color === 'b' ? `b${square.type}` : `w${square.type}`}.png`}
                    priority
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
