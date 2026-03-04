"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

      if (error) throw error;
      
      if (isLogin) {
        router.push("/");
        router.refresh();
      } else {
        setError("Check your email for a confirmation link!");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h1>{isLogin ? "Welcome Back" : "Join the Team"}</h1>
        <p className={styles.subtitle}>
          {isLogin ? "Sign in to view your iSolvRisk Calendar" : "Create an account to join the shared calendar"}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleAuth}>
          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isLogin ? "New here?" : "Already have an account?"}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className={styles.linkButton}
          >
            {isLogin ? " Create an account" : " Sign in instead"}
          </button>
        </p>
      </div>
    </div>
  );
}
