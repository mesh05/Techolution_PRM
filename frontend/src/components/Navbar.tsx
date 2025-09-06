import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "./ui/button"
import { FerrisWheel, Menu, Settings } from "lucide-react"
import { Link } from "react-router-dom";
import { MessageCircle, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar({ user }: { user: any }) {
    const path = window.location.pathname;
    return (
        <nav className="fixed top-0 bg-primary left-0 right-0 z-50 flex justify-between w-screen h-16 border-b p-4">
            <div className="flex gap-4">
                <Sheet>
                    <SheetTrigger>
                        <Menu className="text-secondary cursor-pointer"/>
                    </SheetTrigger>
                    <SheetContent side="left">
                        <SheetHeader>
                            <SheetTitle className="text-2xl my-4">AllocAI</SheetTitle>
                            <div className="flex flex-col gap-2">
                                <Link className="w-full" to="/chat">
                                    <Button className="w-full border-0 justify-start" variant={path === "/chat" ? "default" : "outline"}>
                                        <MessageCircle className={cn("text-secondary", path !== "/chat" ? "text-primary" : "")}/>
                                        Chat
                                    </Button>
                                </Link>
                                <Link className="w-full" to="/projects">
                                    <Button className="w-full border-0 justify-start" variant={path === "/projects" ? "default" : "outline"}>
                                        <Settings className={cn("text-secondary", path !== "/projects" ? "text-primary" : "")}/>
                                        Projects
                                    </Button>
                                </Link>
                                <Link className="w-full" to="/resources">
                                    <Button className="w-full border-0 justify-start" variant={path === "/resources" ? "default" : "outline"}>
                                        <Folder className={cn("text-secondary", path !== "/resources" ? "text-primary" : "")}/>
                                        Resources
                                    </Button>
                                </Link>
                            </div>
                        </SheetHeader>
                    </SheetContent>
                </Sheet>
                <h1 className="text-2xl font-bold text-secondary">AllocAI</h1>
            </div>
            {user && (
                <div className="flex gap-4">
                    <Link to="/chat">
                        <Button variant="outline" onClick={() => {localStorage.removeItem("user")}}>Logout</Button>
                    </Link>
                </div>
            )}
        </nav>
    )
}