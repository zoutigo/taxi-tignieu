"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { AppMessage } from "./app-message";

const categories = [
  "Réservation",
  "Facturation",
  "Incident de trajet",
  "Site internet",
  "Partenariat",
  "Autre",
];

const schema = z.object({
  category: z.string().min(1, "Catégorie requise"),
  subject: z.string().min(2, "Sujet requis"),
  message: z.string().min(5, "Message requis"),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSubmittedRef = useRef(false);
  const hasDraftRef = useRef(false);
  const draftLoadedRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "", subject: "", message: "" },
  });

  const draftKey = useMemo(() => "contact-draft", []);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as FormValues;
        form.reset(parsed);
        hasDraftRef.current = true;
      } catch {
        /* ignore */
      }
    }
    draftLoadedRef.current = true;
  }, [draftKey, form]);

  const saveDraft = (values: FormValues) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(draftKey, JSON.stringify(values));
  };

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(draftKey);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setSuccess(null);
    setError(null);

    const userPhone = (session?.user as { phone?: string } | undefined)?.phone;
    if (!session) {
      saveDraft(values);
      void signIn("google", { callbackUrl: "/contact" });
      return;
    }
    if (!userPhone) {
      saveDraft(values);
      router.push("/profil/completer-telephone");
      return;
    }

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setError("Impossible d'envoyer le message. Réessayez plus tard.");
      return;
    }
    setSuccess("Message envoyé ! Nous revenons vers vous rapidement.");
    clearDraft();
    form.reset({ category: "", subject: "", message: "" });
  });

  useEffect(() => {
    if (
      draftLoadedRef.current &&
      hasDraftRef.current &&
      !autoSubmittedRef.current &&
      session &&
      (session.user as { phone?: string } | undefined)?.phone
    ) {
      autoSubmittedRef.current = true;
      void handleSubmit();
    }
  }, [handleSubmit, session]);

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground">Catégorie</label>
          <select
            {...form.register("category")}
            className="mt-1 w-full rounded-2xl border border-muted bg-background px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>
              Choisissez
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.category?.message}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Sujet</label>
          <input
            type="text"
            {...form.register("subject")}
            className="mt-1 w-full rounded-2xl border border-muted bg-background px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none"
            placeholder="Votre demande"
          />
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.subject?.message}</p>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Message</label>
        <textarea
          rows={5}
          {...form.register("message")}
          className="mt-1 w-full rounded-2xl border border-muted bg-background px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none"
          placeholder="Décrivez votre besoin..."
        />
        <p className="mt-1 text-xs text-destructive">{form.formState.errors.message?.message}</p>
      </div>
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}
      {success ? <AppMessage variant="success">{success}</AppMessage> : null}
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_15px_30px_rgba(245,195,49,0.35)] transition hover:brightness-95 focus:outline-none"
        disabled={form.formState.isSubmitting}
      >
        <Send className="h-4 w-4" />
        {form.formState.isSubmitting ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
