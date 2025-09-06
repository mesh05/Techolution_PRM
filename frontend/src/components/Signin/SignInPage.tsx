import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export default function SignInPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`${API_BASE}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      alert("Invalid credentials");
      return;
    }
    const user = await r.json(); // { id, username, conversation_id }
    localStorage.setItem("user", JSON.stringify(user));
    nav("/dashboard");
  }

  return (
    <div className="flex justify-center items-center h-screen w-full">
      <div className="flex flex-col gap-4 w-1/2">
        <h1 className="text-2xl font-bold">Image</h1>
      </div>
      <div className="flex flex-col justify-center items-center gap-4 w-1/2">
        <div className="w-[500px]">
          <div className="mb-16">
            <p className="font-bold text-5xl my-2">Welcome to AllocAI</p>
            <p className="text-md my-2">AI driven resource allocation for smarter project staffing</p>
          </div>
          <h1 className="text-2xl font-semibold">Sign In</h1>
          <div className="gap-4 mt-4">
            <form onSubmit={onSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    className="bg-gray-100"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    className="bg-gray-100"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="secret | demo | pass123"
                  />
                </div>
                <a href="#" className="flex justify-end">Forgot Password?</a>
                <Button className="w-full" variant="default" type="submit">Sign In</Button>
              </div>
            </form>
          </div>
          <span className="text-center text-sm text-muted-foreground mt-8">
            By signing in, you agree to our <a href="#" className="text-blue-500">Terms & Conditions</a> and <a href="#" className="text-blue-500">Privacy Policy</a>
          </span>
        </div>
      </div>
    </div>
  );
}