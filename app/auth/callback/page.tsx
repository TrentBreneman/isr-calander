"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function handleAuth() {
      // For implicit grant flow (client side), we just wait for the session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!error && session) {
        router.push("/");
      } else {
        // If there's an error or no session, we might still be loading
        // or need to wait for the user to confirm their email
        router.push("/login");
      }
    }
    handleAuth();
  }, [router, supabase]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontStyle: 'italic', color: '#666' }}>
      Finalizing your sign in...
    </div>
  );
}
