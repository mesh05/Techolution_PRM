import SignInPage from "@/components/Signin/SignInPage";
import { Routes, Route } from "react-router-dom";
import DashboardPage from "@/components/Dashboard/DashboardPage";

export default function App() {
  return (
    <div className="flex justify-center items-center h-screen">
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </div>
  )
}