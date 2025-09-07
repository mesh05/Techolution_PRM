import { Input } from "../ui/input";
import { Button } from "../ui/button";
import Navbar from "../Navbar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import { useEffect, useRef } from "react";
import ProjectTable from "@/components/DataTable/ProjectTable";
import { Skeleton } from "../ui/skeleton";
import { useState } from "react";

export default function ProjectPage() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    setFile(selectedFile);
  };

  function uploadFile() {
    if (!file) return;
    console.log("Uploading file:", file);
    fetch('http://localhost:8000/data/projects/upload/', {
      method: 'POST',
      body: file,
      // 👇 Set headers manually for single file upload
      headers: {
        'content-type': file.type,
        'content-length': `${file.size}`, // 👈 Headers need to be a string
      },
    })
      .then((res) => res.json())
      .then((data) => console.log(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    setLoading(true);
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

    const url = `${base}/data/projects?limit=200`;
    const res = fetch(url).then((res) => {
      res.json().then((data) => {
        setLoading(false);
        console.log(data);
        const items: any[] = Array.isArray(data?.items) ? data.items : [];
        setProjects(items);
      });
    });
  }, []);

  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawUser =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = rawUser
    ? (() => {
        try {
          return JSON.parse(rawUser);
        } catch {
          return null;
        }
      })()
    : null;
  if (!user) window.location.href = "/";
  return (
    <div>
      <Navbar user={user} />
      <div className="flex flex-col gap-4 w-screen h-[calc(100vh-12rem)]">
        <div className="space-y-4 px-8">
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-semibold">Projects</h1>
            <div className="flex gap-2">
              <Button variant="outline">Export</Button>
              <Input
                ref={fileInputRef}
                className=""
                type="file"
                onChange={handleFileChange}
              />
              <Button onClick={uploadFile}>
                Upload
              </Button>
            </div>
          </div>
          <div>
            <div>
              {loading ? (
                <>
                  <Skeleton className="h-8 w-1/4" />
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-[125px] w-full rounded-xl" />
                  </div>
                </>
              ) : (
                <ProjectTable data={projects} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
