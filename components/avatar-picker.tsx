"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type Props = {
  avatars: string[];
  redirectTo: string;
};

export function AvatarPicker({ avatars, redirectTo }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!selected) {
      setError("Choisissez un avatar.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: selected }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Impossible d'enregistrer l'avatar.");
      setLoading(false);
      return;
    }
    router.push(redirectTo);
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
        {avatars.map((url) => (
          <button
            type="button"
            key={url}
            onClick={() => setSelected(url)}
            className={`flex items-center justify-center rounded-lg border p-2 transition hover:border-primary ${
              selected === url ? "border-primary ring-2 ring-primary/40" : "border-border/70"
            }`}
            aria-label="Choisir cet avatar"
          >
            <Image
              src={url}
              alt="Avatar"
              width={80}
              height={80}
              className="h-16 w-16 rounded-full"
            />
          </button>
        ))}
      </div>
      <Button onClick={submit} disabled={loading}>
        {loading ? "Enregistrement..." : "Continuer"}
      </Button>
    </div>
  );
}
