import { Input } from "../ui/input";
import { Button } from "../ui/button";
import Navbar from "../Navbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { useRef } from "react";

export default function ProjectPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const user = JSON.parse(localStorage.getItem("user")!);
    return (
        <div>
            <Navbar user={user} />
            <div className="flex flex-col gap-4 w-screen h-[calc(100vh-12rem)]">
                <div className="space-y-4 px-8">
                    <div className="w-full">
                        <h1 className="text-2xl font-semibold">Projects</h1>
                    </div>
                    <div className="flex gap-2 w-full justify-between items-center">
                        <Input className="w-1/2" placeholder="Project name" />
                        <div className="flex gap-2">
                            <Button variant="outline">
                                Export
                            </Button>
                            <Dialog>
                                <DialogTrigger>
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
                                    <DialogClose>
                                        <Button onClick={() => console.log("Add project")} variant="default">Add Project</Button>
                                    </DialogClose>
                                    <Separator />
                                    <DialogClose>
                                        <Input ref={fileInputRef} className="hidden" type="file" onChange={(e) => console.log(e.target.files)}/>
                                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                                    </DialogClose>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>Project 1</TableCell>
                                <TableCell>Client 1</TableCell>
                                <TableCell>2025-09-01</TableCell>
                                <TableCell>2025-09-30</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                </div>

            </div>
        </div>
    )
}
