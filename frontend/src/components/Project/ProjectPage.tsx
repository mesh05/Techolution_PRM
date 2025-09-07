import { Input } from "../ui/input";
import { Button } from "../ui/button";
import Navbar from "../Navbar";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { useEffect, useRef } from "react";
import ProjectTable from "@/components/DataTable/ProjectTable";
import { Skeleton } from "../ui/skeleton";
import { useState } from "react";

export default function ProjectPage() {
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    },[])
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const user = rawUser ? (() => { try { return JSON.parse(rawUser) } catch { return null } })() : null;
    if (!user) window.location.href = "/";
    return (
        <div>
            <Navbar user={user} />
            <div className="flex flex-col gap-4 w-screen h-[calc(100vh-12rem)]">
                <div className="space-y-4 px-8">
                    <div className="w-full">
                        <h1 className="text-2xl font-semibold">Projects</h1>
                    </div>
                    <div className="flex gap-2 w-full justify-between items-center">
                        <div className="flex gap-2">
                            <Button variant="outline">
                                Export
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="default">
                                        Add Project
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Project</DialogTitle>
                                    </DialogHeader>
                                    <Input placeholder="Project name" />
                                    <Input placeholder="Client name" />
                                    <Input placeholder="Start date" type="date" />
                                    <Input placeholder="End date" type="date" />
                                    <DialogClose asChild>
                                        <Button onClick={() => console.log("Add project")} variant="default">Add Project</Button>
                                    </DialogClose>
                                    <Separator />
                                    <Input ref={fileInputRef} className="hidden" type="file" onChange={(e) => console.log(e.target.files)}/>
                                    <DialogClose asChild>
                                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                                    </DialogClose>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div >
                    <div >
                        {loading ? <>
                            <Skeleton className="h-8 w-1/4" />
                            <div className="mt-4 space-y-2">
                                <Skeleton className="h-[125px] w-full rounded-xl" />
                            </div>
                        </>
                        : <ProjectTable/>
                        }
                    </div>
                </div>
                </div>

            </div>
        </div>
    )
}
