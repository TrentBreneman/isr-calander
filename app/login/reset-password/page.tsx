"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import styles from "../login.module.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if we already have a session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If no session, it might be because the URL fragments haven't been processed yet
        // Supabase Browser Client handles fragments automatically, but it takes a moment
        console.log("No initial session on reset page");
      }
    });

    // Listen for the recovery event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      console.log("Auth event on reset page:", event);
      
      if (event === "PASSWORD_RECOVERY") {
        console.log("Confirmed PASSWORD_RECOVERY mode");
      }
      
      if (event === "SIGNED_OUT") {
        setError("Your reset session has ended or the link is invalid. Please request a new link.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      
      // Password updated successfully
      alert("Password updated successfully! You can now sign in.");
      router.push("/login");
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
        <h1>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter your new password below.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleResetPassword}>
          <div className={styles.formGroup}>
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Confirm New Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
