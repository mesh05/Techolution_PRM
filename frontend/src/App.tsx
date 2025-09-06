import SignInPage from "@/components/Signin/SignInPage";
import { Routes, Route } from "react-router-dom";
import ChatPage from "@/components/Chat/ChatPage";
import ProjectPage from "@/components/Project/ProjectPage";
import ResourcePage from "@/components/Resource/ResourcePage";

export default function App() {
  const user = localStorage.getItem("user");
  return (
    <div className="flex justify-center items-center h-screen">
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/projects" element={<ProjectPage />} />
        <Route path="/resources" element={<ResourcePage />} />
      </Routes>
    </div>
  )
}