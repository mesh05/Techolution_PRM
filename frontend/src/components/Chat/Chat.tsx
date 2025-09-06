import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Download, History, PanelLeft, PanelRight, PenBox, Send } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

type User = { id: string; username: string; conversation_id: string };
type Msg = { role: "system" | "user" | "assistant"; content: string; ts?: string };

export default function Dashboard({ user }: { user: User }) {
  const [hideChat, setHideChat] = useState(false);
  const [projectRequirementDoc, setProjectRequirementDoc] = useState<File | null>(null);
  const [resourceDoc, setResourceDoc] = useState<File | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [project, setProject] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headers = useMemo(() => ({ "X-User-ID": user.username }), [user.username]);

  async function loadMessages() {
    const r = await fetch(
      `${API_BASE}/conversations/${user.conversation_id}/messages?limit=200`,
      { headers }
    );
    if (r.ok) {
      const data: Msg[] = await r.json();
      setMessages(data);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleUpload() {
    if (!projectRequirementDoc && !resourceDoc) {
      alert("Please choose at least one file");
      return;
    }
    const fd = new FormData();
    fd.append("conversation_id", user.conversation_id);
    if (projectRequirementDoc) fd.append("files", projectRequirementDoc);
    if (resourceDoc) fd.append("files", resourceDoc);
    const r = await fetch(`${API_BASE}/files/upload`, {
      method: "POST",
      headers,
      body: fd,
    });
    if (!r.ok) {
      alert("Upload failed");
      return;
    }
    const res = await r.json();
    console.log("Uploaded:", res);
    alert("Uploaded successfully");
  }

  async function handleAsk() {
    if (newChat) setNewChat(false);
    const q = input.trim();
    if (!q) return;
    setInput("");
    // optimistic render
    setMessages((m) => [...m, { role: "user", content: q }]);

    const r = await fetch(`${API_BASE}/ai/ask/${user.conversation_id}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    if (!r.ok) {
      setMessages((m) => [...m, { role: "assistant", content: "(error talking to AI)" }]);
      return;
    }
    const { answer } = await r.json();
    setMessages((m) => [...m, { role: "assistant", content: answer }]);
  }

  async function downloadFilesList() {
    const r = await fetch(`${API_BASE}/files/${user.conversation_id}`, { headers });
    if (!r.ok) return alert("Could not list files");
    const data = await r.json(); // { files: [{filename, size}] }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "files.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex justify-center items-center h-screen w-screen pt-16">
      {/* Chat pane */}
      <div className={cn("flex flex-col p-4 h-full w-1/3", hideChat ? "hidden" : "")}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-2">Chat</h1>
            <Button variant="outline" onClick={() => {
              setNewChat(true)
              setProject(null)
              setMessages([])
            }}>
              New Chat<PenBox />
            </Button>
        </div>
        <Separator className="my-2"/>
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2">
          {newChat && (
            <div className="flex flex-col mt-8">
              <h1 className="text-4xl font-bold mb-2 text-primary text-center">AllocAI</h1>
              <p className="text-sm text-gray-500 text-center">Your AI copilot for resources, projects and insights.</p>
            </div>
          )}
          {newChat && (
          <div className="flex gap-2 justify-center mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">{project ? `Project: ${project}` : "Get started by selecting a project"}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[245px]">
                  <DropdownMenuItem onSelect={() => {
                    setProject("Project 1");
                    setNewChat(false);
                  }}>
                    Project 1
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => {
                    setProject("Project 2");
                    setNewChat(false);
                  }}>
                    Project 2
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

          </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`p-2 rounded ${m.role === "user" ? "bg-blue-50 self-end" : "bg-gray-50 self-start"}`}>
              <div className="text-xs opacity-60 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
          <div className="flex gap-2 mt-2 mb-2">
            <Input
              type="text"
              placeholder="Ask something about your uploaded docs…"
              value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <Button onClick={handleAsk}><Send className="w-4 h-4" /></Button>
        </div>
      </div>

      <Separator orientation="vertical" />

      {/* Right pane */}
      <div className="flex flex-col gap-4 w-full h-full bg-gray-100 p-4">
        <div className="flex flex-col text-center gap-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setHideChat(!hideChat)}>
              {hideChat ? <PanelRight/> : <PanelLeft/>}
            </Button>
            <div className="flex font-semibold gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline"><History /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Result 1</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Result 2</DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu> 
              <Button variant="outline">Download <Download onClick={downloadFilesList} /></Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Upload your docs, then ask questions in the chat. Responses are stored in the conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
