import Image from "next/image";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
// import {PrismaClient} from "@repo/db/client";
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#312e2b]">
        <div className="w-screen flex">
            <nav className="min-h-screen w-[15%] bg-[#262421] flex flex-col items-center">
                <div className="flex items-end text-2xl font-extrabold text-white p-5">
                    <Image src="/chess.svg" alt="chess logo" height={40} width={40} color={"white"}/>
                    Chess.com
                </div>
                <Separator className="bg-[#312e2b]"/>
                <div className="flex flex-col items-center gap-2 w-full mx-2 p-5">
                    <Button className="w-full h-10 p-1 text-lg bg-[#69923E] hover:bg-[#4E7837]">Login</Button>
                    <Button className="w-full h-10 p-1 text-lg bg-[#69923E] hover:bg-[#4E7837]">Register</Button>
                </div>
            </nav>
            <div className="min-h-screen w-[85%] flex items-center justify-center px-40">
                <div>
                    <Image src={"/chessboard.gif"} alt={"chess board"} width={700} height={700} />
                </div>
                <div className="text-center">
                    <h1 className="text-5xl font-extrabold text-white">Play Chess Online on #1 site</h1>
                    <p className="text-lg/7 mt-5 font-semibold line text-white">Join and play chess with world best community</p>
                    <Button
                        className="w-[75%] bg-green- mt-7 text-2xl font-extrabold rounded-3xl p-4 h-16 bg-[#69923E] hover:bg-[#4E7837]"
                    >
                        Play
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
