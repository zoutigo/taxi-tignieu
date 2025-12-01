"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { phoneSchema, type PhoneFormInput } from "@/schemas/profile";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface PhoneFormProps {
  defaultPhone?: string | null;
  redirectTo?: string;
}

export function PhoneForm({ defaultPhone, redirectTo = "/espace-client" }: PhoneFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<PhoneFormInput>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: defaultPhone ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/profile/phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Impossible d'enregistrer le numéro pour le moment.");
      }

      try {
        await update({ phone: values.phone });
      } catch {
        // Si la session ne retourne pas de JSON, on ignore et on force un refresh plus bas
      }
      setSuccess(true);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de téléphone</FormLabel>
              <FormControl>
                <Input
                  placeholder="+33 4 95 78 54 00"
                  inputMode="tel"
                  autoComplete="tel"
                  className="text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="text-sm text-emerald-600">Numéro enregistré, redirection en cours…</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer et continuer"}
        </Button>
      </form>
    </Form>
  );
}
