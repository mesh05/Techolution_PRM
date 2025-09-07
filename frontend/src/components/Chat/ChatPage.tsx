import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import Chat from "./Chat";

export default function DashboardPage() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      nav("/");
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem("user");
      nav("/");
    }
  }, [nav]);

  if (!user) return null;
  return (
    <>
      <Navbar user={user} />
      <Chat user={user} />
    </>
  )
}
