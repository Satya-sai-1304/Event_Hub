import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User, UserRole } from "@/data/mockData";
import api from "@/lib/api";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  socket: Socket | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('auth-user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that the user has required fields including id
        if (parsed && parsed.id && parsed.email && parsed.role) {
          return parsed;
        }
        // Invalid user data, clear it
        sessionStorage.removeItem('auth-user');
      } catch {
        sessionStorage.removeItem('auth-user');
      }
    }
    return null;
  });

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
      newSocket.on("connect", () => {
        console.log("Connected to socket server");
        newSocket.emit("join_room", user.id);
      });

      newSocket.on("receive_notification", (data) => {
        toast.info(`${data.title}: ${data.message}`, {
          description: "New notification received!",
        });
      });

      setSocket(newSocket);
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/users/login', { email, password });
      const loggedUser = res.data.user;
      setUser(loggedUser);
      sessionStorage.setItem('auth-user', JSON.stringify(loggedUser));
      toast.success("Login successful!");
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid credentials");
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/users', { name, email, password });
      const newUser = res.data;
      setUser(newUser);
      sessionStorage.setItem('auth-user', JSON.stringify(newUser));
      toast.success("Registration successful!");
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('auth-user');
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser, isAuthenticated: !!user, socket }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
