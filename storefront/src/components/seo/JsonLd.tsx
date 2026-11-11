import React from "react";

interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>> | null | undefined;
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) return null;
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.filter(Boolean).map((item, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}

