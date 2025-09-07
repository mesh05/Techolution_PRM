import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Download, History, PanelLeft, PanelRight, PenBox, Send, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

const output = "```json\n{\n  \"Project_ID\": \"P009\",\n  \"Requested_Role\": \"AI Engineer\",\n  \"Allocations\": [\n    {\n      \"Resource_ID\": \"R090\",\n      \"Name\": \"Ishaan Miller\",\n      \"Skills\": [\"Python\", \"Azure\", \"HuggingFace\", \"AWS\", \"Git\"],\n      \"Proficiency_Level\": \"Intermediate\",\n      \"Available_Capacity\": \"42 hours/week\",\n      \"Availability_Date\": \"2025-09-29\",\n      \"Reasoning\": \"Ishaan possesses strong Python skills and expertise in HuggingFace, directly aligning with the project's requirements for Python and Transformers. His intermediate proficiency and full availability make him an excellent fit.\",\n      \"Skill_Match_Percentage\": \"66.67%\"\n    },\n    {\n      \"Resource_ID\": \"R093\",\n      \"Name\": \"Aisha Smith\",\n      \"Skills\": [\"TensorFlow\", \"HuggingFace\", \"RAG\", \"SQL\", \"OpenAI API\", \"Linux\"],\n      \"Proficiency_Level\": \"Beginner\",\n      \"Available_Capacity\": \"35 hours/week\",\n      \"Availability_Date\": \"2025-10-12\",\n      \"Reasoning\": \"Aisha brings TensorFlow expertise, crucial for Deep Learning, and also has HuggingFace experience for Transformers. Her availability before the project start date complements Ishaan's profile, providing comprehensive coverage of the required skills.\",\n      \"Skill_Match_Percentage\": \"66.67%\"\n    }\n  ],\n  \"Allocation_Plan\": [\n    \"Allocate Ishaan Miller (R090) to Project P009 for 42 hours/week starting 2025-09-29.\",\n    \"Allocate Aisha Smith (R093) to Project P009 for 35 hours/week starting 2025-10-12.\"\n  ],\n  \"Total_Hours\": \"77 hours/week\",\n  \"Fit_Explanation\": \"This allocation provides two AI Engineers with a combined 77 hours/week, covering all critical skills 'Python', 'Transformers' (via HuggingFace), and 'Deep Learning' (via TensorFlow). Both resources are available before the project's start date of 2025-10-14, ensuring timely staffing for 'Speech-to-text analytics'.\"\n}\n```";
type User = { id: string; username: string; conversation_id: string };
type Msg = { role: "system" | "user" | "assistant"; content: string; ts?: string };

export default function Dashboard({ user }: { user: User }) {
  const [hideChat, setHideChat] = useState(false);
  const [result, setResult] = useState<any>(JSON.parse(output.slice(7, -3)));
  const [resultLoading, setResultLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
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

  // async function handleUpload() {
  //   if (!projectRequirementDoc && !resourceDoc) {
  //     alert("Please choose at least one file");
  //     return;
  //   }
  //   const fd = new FormData();
  //   fd.append("conversation_id", user.conversation_id);
  //   if (projectRequirementDoc) fd.append("files", projectRequirementDoc);
  //   if (resourceDoc) fd.append("files", resourceDoc);
  //   const r = await fetch(`${API_BASE}/files/upload`, {
  //     method: "POST",
  //     headers,
  //     body: fd,
  //   });
  //   if (!r.ok) {
  //     alert("Upload failed");
  //     return;
  //   }
  //   const res = await r.json();
  //   console.log("Uploaded:", res);
  //   alert("Uploaded successfully");
  // }

  async function handleAsk() {
    if (newChat) setNewChat(false);
    setLoadingMsg(true);
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
    setLoadingMsg(false);
  }

  // async function downloadFilesList() {
  //   const r = await fetch(`${API_BASE}/files/${user.conversation_id}`, { headers });
  //   if (!r.ok) return alert("Could not list files");
  //   const data = await r.json(); // { files: [{filename, size}] }
  //   const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "files.json";
  //   a.click();
  //   URL.revokeObjectURL(url);
  // }

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
          {loadingMsg && (
            <div className="p-2 rounded bg-gray-50 min-w-[150px] self-start">
              <div className="text-xs opacity-60 mb-1"><div className="flex p-1 items-center rounded-2xl w-5 h-5 bg-primary"><Sparkles className="w-4 h-4 text-white"/></div></div>
              <div className="whitespace-pre-wrap">Thinking…</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`w-full max-w-[250px] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}>
              <div className="flex gap-2">
                <div className="text-xs opacity-60 mt-2">
                  {m.role === "user" ? "" : <div className="flex p-1 items-center rounded-2xl w-5 h-5 bg-primary"><Sparkles className="w-4 h-4 text-white"/></div>}
                </div>
                <div className={cn("whitespace-pre-wrap p-3 rounded-lg w-full break-words", 
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary"
                )}>
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
            {/* <div className="flex font-semibold gap-4">
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
            </div> */}
          </div>
          <p className="text-sm text-gray-500">
            Update your <Link className="underline text-primary" to="/projects">Projects</Link> and <Link className="underline text-primary" to="/resources">Resources</Link> and ask questions in the chat.
          </p>
          <div className="flex flex-col mt-4 min-h-0 flex-1">
            <h3 className="text-lg font-semibold">Recommended Allocations</h3>
            <div className="flex-1 mt-4 overflow-y-auto pr-2 min-h-0">
              <div className="flex flex-wrap gap-4 justify-center content-start">
                {result.Allocations.map((allocation: any, i: number) => (
                  <div key={i} className="w-full sm:w-1/2 xl:w-1/3 flex">
                    <Card className="flex-1 pt-0">
                      <CardHeader className="bg-primary text-primary-foreground border-b pt-3 rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-secondary font-medium text-left">{allocation.Name}</CardTitle>
                            <CardDescription className="text-left text-secondary mt-2">
                              Skill match:{allocation.Skill_Match_Percentage}
                              <br/>
                              Role: {result.Requested_Role}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs" variant="secondary">
                              {allocation.Proficiency_Level}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-1">Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {allocation.Skills.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Reasoning</h5>
                          <p className="text-sm text-muted-foreground">
                            {allocation.Reasoning}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
