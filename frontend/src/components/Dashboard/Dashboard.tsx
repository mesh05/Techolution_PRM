import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Download, Send } from "lucide-react";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";

export default function Dashboard({ user }: { user: any }) {
    const [projectRequirementDoc, setProjectRequirementDoc] = useState<any>(null);
    const [resourceDoc, setResourceDoc] = useState<any>(null);
    if(!user) {
        console.log("User not found");
    }

    return (
        <div className="flex justify-center items-center h-screen w-screen pt-16">
            <div className="flex flex-col p-4 h-full w-1/4">
                <h1 className="text-2xl font-bold">Chat</h1>
                <div className="flex flex-col gap-4 h-full">
                    messages
                </div>
                <div className="flex flex-col gap-4 relative">
                    <div className="sticky bottom-0 flex gap-4 ">
                        <Input type="text" placeholder="Enter your message" />
                        <Send className="cursor-pointer" onClick={() => console.log("Send")}/>
                    </div>
                </div>
            </div>
            <Separator orientation="vertical" />
            <div className="flex flex-col gap-4 w-3/4 h-full bg-gray-100 p-4">
                <div className="flex gap-4">
                    <Label>Project requirement Doc</Label>
                    <Input type="file" onChange={(e) => setProjectRequirementDoc(e.target.files?.[0])}/>
                    <Label>Resource Doc</Label>
                    <Input type="file" onChange={(e) => setResourceDoc(e.target.files?.[0])}/>
                    <Button onClick={() => console.log("Submit")}>Submit</Button>
                </div>
                <Separator orientation="horizontal"/>
                <div className="flex flex-col text-center gap-4">
                    <div className="flex justify-between cursor-pointer gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Button variant="outline">result 1</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>result 1</DropdownMenuItem>
                                <DropdownMenuItem>result 2</DropdownMenuItem>
                                <DropdownMenuItem>result 3</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Download onClick={() => console.log("Download")}/>
                    </div>
                    <h1>Response</h1>
                </div>
            </div>
        </div>
    )
}