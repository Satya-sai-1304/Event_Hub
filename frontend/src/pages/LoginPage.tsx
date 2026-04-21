import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PartyPopper, Eye, EyeOff } from "lucide-react";
import { FaGoogle, FaGithub } from "react-icons/fa";

const LoginPage = () => {
  const { login, register, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const socialAuth = params.get("social_auth");
    if (socialAuth) {
      try {
        const userData = JSON.parse(decodeURIComponent(socialAuth));
        setUser(userData);
        sessionStorage.setItem('auth-user', JSON.stringify(userData));
        toast.success("Login successful!");
        
        // Try to get redirect path from state or localStorage
        const redirectTo = location.state?.from || localStorage.getItem('login_redirect') || "/dashboard";
        localStorage.removeItem('login_redirect'); // Clean up
        navigate(redirectTo);
      } catch (err) {
        console.error("Error parsing social auth data", err);
        toast.error("Social login failed. Please try again.");
      }
    }
  }, [location, setUser, navigate]);

  const handleSocialLogin = (provider: 'google' | 'github') => {
    // Store the redirect path if it exists in state
    if (location.state?.from) {
      localStorage.setItem('login_redirect', location.state.from);
    }
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/${provider}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(loginEmail, loginPassword);
    setIsLoading(false);
    if (success) {
      const redirectTo = location.state?.from || "/dashboard";
      navigate(redirectTo);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await register(regName, regEmail, regPassword);
    setIsLoading(false);
    if (success) {
      const redirectTo = location.state?.from || "/dashboard";
      navigate(redirectTo);
    }
  };

  const SocialButtons = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Button 
        type="button" 
        variant="outline" 
        className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 transition-colors"
        onClick={() => handleSocialLogin('google')}
      >
        <FaGoogle className="text-red-500" />
        Google
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 transition-colors"
        onClick={() => handleSocialLogin('github')}
      >
        <FaGithub />
        GitHub
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-start pt-24 p-6 relative">
        {/* Animated Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80" 
            alt="Wedding Celebration" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-purple-600/70 to-blue-600/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Auth Forms */}
        <div className="w-full max-w-md animate-fade-in z-10">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/20 backdrop-blur-md border border-white/30 text-white">
              <TabsTrigger value="login" className="data-[state=active]:bg-white/30 data-[state=active]:text-white">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white/30 data-[state=active]:text-white">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white shadow-2xl">
                <CardHeader>
                  <CardTitle className="font-display text-white text-2xl">Welcome back</CardTitle>
                  <CardDescription className="text-white/80">Sign in with your email and password</CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialButtons />
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/20" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                      <span className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-full text-white/60 border border-white/10">Or continue with email</span>
                    </div>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80 font-medium">Email Address</Label>
                      <Input id="email" type="email" placeholder="admin@gmail.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="bg-white/10 border-white/30 text-white placeholder:text-white/40 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white/80 font-medium">Password</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="admin@123" 
                          value={loginPassword} 
                          onChange={(e) => setLoginPassword(e.target.value)} 
                          required 
                          className="bg-white/10 border-white/30 text-white placeholder:text-white/40 h-11 pr-10" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 gradient-primary text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white shadow-2xl">
                <CardHeader>
                  <CardTitle className="font-display text-white text-2xl">Create an account</CardTitle>
                  <CardDescription className="text-white/80">Join as a customer to book events</CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialButtons />
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/20" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                      <span className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-full text-white/60 border border-white/10">Or continue with email</span>
                    </div>
                  </div>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-white/80 font-medium">Full Name</Label>
                      <Input id="reg-name" placeholder="Rahul Sharma" value={regName} onChange={(e) => setRegName(e.target.value)} required className="bg-white/10 border-white/30 text-white placeholder:text-white/40 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-white/80 font-medium">Email Address</Label>
                      <Input id="reg-email" type="email" placeholder="rahul@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="bg-white/10 border-white/30 text-white placeholder:text-white/40 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-white/80 font-medium">Password</Label>
                      <div className="relative">
                        <Input 
                          id="reg-password" 
                          type={showRegPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          value={regPassword} 
                          onChange={(e) => setRegPassword(e.target.value)} 
                          required 
                          className="bg-white/10 border-white/30 text-white placeholder:text-white/40 h-11 pr-10" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        >
                          {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 gradient-primary text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

