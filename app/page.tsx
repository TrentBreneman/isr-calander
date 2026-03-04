import Calendar from "@/components/Calendar";
import Logo from "@/components/Logo";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.mainContainer}>
      <header className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Logo />
          <h1 style={{ margin: 0 }}>iSolvRisk Calendar</h1>
        </div>
        <p>Stay in sync with the team.</p>
      </header>
      <Calendar />
    </main>
  );
}
