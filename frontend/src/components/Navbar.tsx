export default function Navbar({ user }: { user: any }) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between w-screen h-16 border-b p-4">
            <div className="flex gap-4">
                <h1 className="text-2xl font-bold">AllocAI</h1>
            </div>
            {user && (
                <div className="flex gap-4">
                    <a href="/">Home</a>
                    <a href="/dashboard">Dashboard</a>
                    <a href="/" onClick={() => localStorage.removeItem("user")}>Logout</a>
                </div>
            )}
        </nav>
    )
}