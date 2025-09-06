import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Dashboard from "./Dashboard";

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    useEffect(() => {
        const user = localStorage.getItem("user");
        if (!user) {
            console.log("User not found");
        }
        setUser(user);
    }, []);

    return (
        <div>
            <Navbar user={user}/>
            <Dashboard user={user}/>
        </div>
    )
}