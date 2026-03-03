import Calendar from "@/components/Calendar";

export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "800", letterSpacing: "-0.02em" }}>
          Company Calendar
        </h1>
        <p style={{ color: "var(--gray-700)", marginTop: "0.5rem" }}>
          Stay in sync with the team.
        </p>
      </header>
      <Calendar />
    </main>
  );
}
