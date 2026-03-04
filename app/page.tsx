import Calendar from "@/components/Calendar";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.mainContainer}>
      <header className={styles.pageHeader}>
        <h1>Company Calendar</h1>
        <p>Stay in sync with the team.</p>
      </header>
      <Calendar />
    </main>
  );
}
