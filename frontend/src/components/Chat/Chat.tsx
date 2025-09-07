import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import {
  Download,
  History,
  PanelLeft,
  PanelRight,
  PenBox,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

type User = { id: string; username: string; conversation_id: string };
type Msg = {
  role: "system" | "user" | "assistant";
  content: string;
  ts?: string;
};
type FileListResponse = { files: { filename: string; size: number }[] };
type ProjectsList = { projects: { project_id: string; name: string }[] };

// --- helpers: parse answer to JSON safely ---
function extractJson(text: string): any | null {
  if (!text) return null;

  // Prefer fenced ```json ... ```
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      const obj = JSON.parse(fenced[1]);
      return obj?.output ?? obj; // support { output: {...} } or direct object
    } catch {}
  }

  // Greedy fallback: from first { to last }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    try {
      const obj = JSON.parse(text.slice(first, last + 1));
      return obj?.output ?? obj;
    } catch {}
  }

  return null;
}

export default function Dashboard({ user }: { user: User }) {
  const [hideChat, setHideChat] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [project, setProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headers = useMemo(
    () => ({ "X-User-ID": user.username }),
    [user.username]
  );

  async function loadMessages() {
    setLoadingMsgs(true);
    try {
      const r = await fetch(
        `${API_BASE}/conversations/${user.conversation_id}/messages?limit=200`,
        { headers }
      );
      if (!r.ok) throw new Error("failed to load messages");
      const data: Msg[] = await r.json();
      setMessages(data);

      // populate right pane from latest assistant JSON, if any
      for (let i = data.length - 1; i >= 0; i--) {
        const m = data[i];
        if (m.role !== "assistant") continue;
        const parsed = extractJson(m.content);
        if (parsed && Array.isArray(parsed.Allocations)) {
          setResult(parsed);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function loadProjects() {
    try {
      const r = await fetch(
        `${API_BASE}/data/projects?conversation_id=${user.conversation_id}`,
        { headers }
      );
      if (!r.ok) return;
      const data: ProjectsList = await r.json();
      setProjects(
        (data.projects || []).map((p) => ({
          id: p.project_id,
          name: p.name || p.project_id,
        }))
      );
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadMessages();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.conversation_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleAsk() {
    if (newChat) setNewChat(false);
    setLoadingMsg(true);

    const q = input.trim();
    if (!q) {
      setLoadingMsg(false);
      return;
    }
    setInput("");

    // optimistic render
    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "Thinking..." },
    ]);

    try {
      const r = await fetch(`${API_BASE}/ai/ask/${user.conversation_id}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!r.ok) throw new Error("error talking to AI");

      const { answer } = await r.json();

      // parse, set result, and avoid dumping raw JSON into chat
      const parsed = JSON.parse(
        JSON.parse(answer)
          .output.replaceAll("```json", "")
          .replaceAll("```", "")
      );
      console.log(parsed);
      if (parsed && Array.isArray(parsed.Allocations)) {
        setResult(parsed);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Check right →" },
        ]);
      } else {
        // no structured result; just show the plain text
        setMessages((m) => [...m, { role: "assistant", content: answer }]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "(error talking to AI)" },
      ]);
    } finally {
      setLoadingMsg(false);
    }
  }

  async function startNewChat() {
    try {
      const r = await fetch(`${API_BASE}/conversations`, {
        method: "POST",
        headers,
      });
      if (!r.ok) throw new Error("could not create conversation");
      const data: { id: string } = await r.json();
      const u = { ...user, conversation_id: data.id };
      localStorage.setItem("user", JSON.stringify(u));
      setMessages([]);
      setProject(null);
      setResult(null);
      setNewChat(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to create a new conversation");
    }
  }

  async function downloadFilesList() {
    try {
      const r = await fetch(`${API_BASE}/files/${user.conversation_id}`, {
        headers,
      });
      if (!r.ok) throw new Error("Could not list files");
      const data: FileListResponse = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "files.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Download failed");
    }
  }

  return (
    <div className="flex justify-center items-center h-screen w-screen pt-16">
      {/* Chat pane */}
      <div
        className={cn(
          "flex flex-col p-4 h-full w-1/3",
          hideChat ? "hidden" : ""
        )}
      >
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-2">Chat</h1>
          <Button variant="outline" onClick={startNewChat}>
            New Chat
            <PenBox />
          </Button>
        </div>
        <Separator className="my-2" />
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2">
          {newChat && (
            <div className="flex flex-col mt-8">
              <h1 className="text-4xl font-bold mb-2 text-primary text-center">
                AllocAI
              </h1>
              <p className="text-sm text-gray-500 text-center">
                Your AI copilot for resources, projects and insights.
              </p>
            </div>
          )}
          {newChat && (
            <div className="flex gap-2 justify-center mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {project
                      ? `Project: ${project}`
                      : "Get started by selecting a project"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[260px]">
                  {projects.length === 0 ? (
                    <>
                      <DropdownMenuLabel>No projects yet</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled>
                        Upload a project sheet first
                      </DropdownMenuItem>
                    </>
                  ) : (
                    projects.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onSelect={() => {
                          setProject(p.name);
                          setNewChat(false);
                        }}
                      >
                        {p.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {loadingMsgs && (
            <div className="text-xs text-gray-500">Loading messages…</div>
          )}
          {loadingMsg && (
            <div className="p-2 rounded bg-gray-50 min-w-[150px] self-start">
              <div className="text-xs opacity-60 mb-1">
                <div className="flex p-1 items-center rounded-2xl w-5 h-5 bg-primary">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="whitespace-pre-wrap">Thinking…</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`w-full max-w-[250px] ${
                m.role === "user" ? "ml-auto" : "mr-auto"
              }`}
            >
              <div className="flex gap-2">
                <div className="text-xs opacity-60 mt-2">
                  {m.role === "user" ? (
                    ""
                  ) : (
                    <div className="flex p-1 items-center rounded-2xl w-5 h-5 bg-primary">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "whitespace-pre-wrap p-3 rounded-lg w-full break-words",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  )}
                >
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 mt-2 mb-2">
          <Input
            type="text"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={loadingMsg}
          />
          <Button onClick={handleAsk} disabled={loadingMsg || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator orientation="vertical" />

      {/* Right pane */}
      <div className="flex flex-col gap-4 w-full h-full bg-gray-100 p-4">
        <div className="flex flex-col text-center gap-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setHideChat(!hideChat)}>
              {hideChat ? <PanelRight /> : <PanelLeft />}
            </Button>
            <div className="flex font-semibold gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <History />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Result 1</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Result 2</DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={downloadFilesList}>
                Download <Download className="ml-2" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Update your{" "}
            <Link className="underline text-primary" to="/projects">
              Projects
            </Link>{" "}
            and{" "}
            <Link className="underline text-primary" to="/resources">
              Resources
            </Link>{" "}
            and ask questions in the chat.
          </p>

          <div className="flex flex-col mt-4 min-h-0 flex-1">
            <h3 className="text-lg font-semibold">Recommended Allocations</h3>
            <div className="flex-1 mt-4 overflow-y-auto pr-2 min-h-0">
              <div className="flex flex-wrap gap-4 justify-center content-start">
                {Array.isArray(result?.Allocations) &&
                result.Allocations.length > 0 ? (
                  result.Allocations.map((allocation: any, i: number) => (
                    <div key={i} className="w-full sm:w-1/2 xl:w-1/3 flex">
                      <Card className="flex-1 pt-0">
                        <CardHeader className="bg-primary text-primary-foreground border-b pt-3 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-secondary font-medium text-left">
                                {allocation?.Name ?? "—"}
                              </CardTitle>
                              <CardDescription className="text-left text-secondary mt-2">
                                Skill match:{" "}
                                {allocation?.MatchPercentage ?? "—"}
                                <br />
                                Role: {result?.Requested_Role ?? "—"}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs" variant="secondary">
                                {allocation?.Proficiency_Level ?? "—"}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-1">Skills</h5>
                            <div className="flex flex-wrap gap-2">
                              {(allocation?.Skills ?? []).map(
                                (skill: string, idx: number) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                )
                              )}
                              {!(allocation?.Skills ?? []).length && (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Reasoning</h5>
                            <p className="text-sm text-muted-foreground">
                              {allocation?.Reasoning ?? "—"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic">
                    Ask a question in the chat to see recommended allocations.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
