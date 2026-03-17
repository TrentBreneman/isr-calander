"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import styles from "../login.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/reset-password`,
      });

      if (error) throw error;
      
      setMessage("Check your email for a password reset link!");
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
        <h1>Forgot Password?</h1>
        <p className={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {message && <div style={{ 
          background: '#ecfdf5', 
          color: '#059669', 
          padding: '0.75rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem', 
          fontSize: '0.85rem',
          border: '1px solid #6ee7b7'
        }}>{message}</div>}

        <form onSubmit={handleResetRequest}>
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
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className={styles.toggleText}>
          Remembered your password?
          <button 
            type="button" 
            onClick={() => router.push("/login")}
            className={styles.linkButton}
          >
            {" Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
