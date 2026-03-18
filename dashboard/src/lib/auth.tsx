"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { API_URL } from "@/lib/api";

interface User {
  id: number;
  email: string;
}

interface Team {
  id: number;
  name: string;
  plan: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  team: Team | null;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, teamName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    team: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_team");
    setState({ token: null, user: null, team: null });
  }, []);

  // Auto-refresh on mount — restore token from localStorage and verify it
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("auth_user");
    const savedTeam = localStorage.getItem("auth_team");

    if (savedToken && savedUser) {
      const user = JSON.parse(savedUser) as User;
      const team = savedTeam ? (JSON.parse(savedTeam) as Team) : null;

      // Verify token is still valid
      fetch(`${API_URL}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Token expired");
        })
        .then((data) => {
          const refreshedUser: User = data.user || user;
          const refreshedTeam: Team = data.team || team;
          localStorage.setItem("auth_user", JSON.stringify(refreshedUser));
          if (refreshedTeam) {
            localStorage.setItem("auth_team", JSON.stringify(refreshedTeam));
          }
          setState({
            token: savedToken,
            user: refreshedUser,
            team: refreshedTeam,
          });
        })
        .catch(() => {
          // Token invalid — clear everything and force re-login
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_team");
          setState({ token: null, user: null, team: null });
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.message || "Login failed");
    }

    const data = await res.json();
    const token: string = data.token;
    const user: User = data.user;
    const team: Team | null = data.team || null;

    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    if (team) {
      localStorage.setItem("auth_team", JSON.stringify(team));
    }

    setState({ token, user, team });
  }, []);

  const signup = useCallback(
    async (email: string, password: string, teamName: string) => {
      const res = await fetch(`${API_URL}/api/auth/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, team_name: teamName }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || error.message || "Signup failed");
      }

      const data = await res.json();
      const token: string = data.token;
      const user: User = data.user;
      const team: Team | null = data.team || null;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
      if (team) {
        localStorage.setItem("auth_team", JSON.stringify(team));
      }

      setState({ token, user, team });
    },
    []
  );

  const isAuthenticated = !!state.token;

  return (
    <AuthContext.Provider
      value={{ ...state, isAuthenticated, isLoading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
