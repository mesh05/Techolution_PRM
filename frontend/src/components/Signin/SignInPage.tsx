import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
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
                        <form>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input className="bg-gray-100" id="email" type="email" placeholder="email@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input className="bg-gray-100" id="password" type="password" placeholder="••••••••" />
                                </div>
                                <a href="#" className="flex justify-end">
                                    Forgot Password?
                                </a>
                                <Button className="w-full" variant="default" type="submit">Sign In</Button>
                            </div>
                        </form>
                    </div>
                    <span className="text-center text-sm text-muted-foreground mt-8">By signing in, you agree to our <a href="#" className="text-blue-500">Terms & Conditions</a> and <a href="#" className="text-blue-500">Privacy Policy</a></span>
                </div>
            </div>
        </div>
    )
}