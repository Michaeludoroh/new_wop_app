import Link from "next/link";

type ModulePageProps = {
  title: string;
  description: string;
  endpointPlaceholder?: string;
};

export default function ModulePage({
  title,
  description,
  endpointPlaceholder = "Connect to API endpoint in next iteration."
}: ModulePageProps) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #eaecf0",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
      }}
    >
      <h1 style={{ marginTop: 0, marginBottom: 8, color: "#101828" }}>{title}</h1>
      <p style={{ marginTop: 0, color: "#475467" }}>{description}</p>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "#f9fafb",
          border: "1px dashed #d0d5dd",
          borderRadius: 8,
          color: "#344054",
          fontSize: 14
        }}
      >
        API placeholder: {endpointPlaceholder}
      </div>

      <div style={{ marginTop: 18 }}>
        <Link href="/" style={{ color: "#175cd3", textDecoration: "none", fontWeight: 600 }}>
          ← Back to Dashboard
        </Link>
      </div>
    </section>
  );
}
