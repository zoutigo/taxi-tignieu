"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reviewFormSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3).max(500),
});

type ReviewFormInput = z.infer<typeof reviewFormSchema>;

export function ReviewsForm() {
  const form = useForm<ReviewFormInput>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 5, comment: "" },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error ?? "Impossible d'envoyer l'avis.");
      return;
    }
    setSuccess(true);
    form.reset({ rating: 5, comment: "" });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(Number(v))}
                defaultValue="5"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Note sur 5" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {"★".repeat(n)}{" "}
                      <span className="text-muted-foreground">{"☆".repeat(5 - n)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commentaire</FormLabel>
              <Textarea rows={4} placeholder="Votre avis..." className="text-sm" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="text-sm text-emerald-600">
            Merci ! Votre avis est enregistré et sera affiché après validation.
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Envoi..." : "Envoyer"}
        </Button>
      </form>
    </Form>
  );
}
