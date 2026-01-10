"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { phoneSchema } from "@/schemas/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type PhoneForm = z.infer<typeof phoneSchema>;

export function PhoneInlineEditor({ initialPhone }: { initialPhone: string }) {
  const [editing, setEditing] = useState(false);
  const [displayPhone, setDisplayPhone] = useState(initialPhone);
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const form = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    mode: "onChange",
    defaultValues: { phone: initialPhone },
  });

  const handleSave = form.handleSubmit(async (values) => {
    const previous = displayPhone;
    setStatus(null);
    setDisplayPhone(values.phone);
    try {
      const res = await fetch("/api/profile/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Impossible de mettre à jour le numéro.");
      }
      setStatus({ type: "success", message: "Numéro mis à jour." });
      setEditing(false);
    } catch (err) {
      setDisplayPhone(previous);
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Impossible de mettre à jour le numéro.",
      });
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Téléphone</p>
          <p className="text-base font-semibold text-foreground">{displayPhone || "—"}</p>
        </div>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setEditing(true)}
          >
            Mettre à jour
          </Button>
        ) : null}
      </div>

      {editing ? (
        <Form {...form}>
          <form className="space-y-3" onSubmit={handleSave}>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau téléphone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="+33 4 95 78 54 00"
                      className="text-base"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={form.formState.isSubmitting || !form.formState.isValid}
              >
                {form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                disabled={form.formState.isSubmitting}
                onClick={() => {
                  form.reset({ phone: displayPhone });
                  setEditing(false);
                  setStatus(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        </Form>
      ) : null}

      {status ? (
        <p
          className={
            status.type === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"
          }
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
