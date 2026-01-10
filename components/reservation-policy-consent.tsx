"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
type Props = {
  field: {
    value: boolean | null | undefined;
    onChange: (value: boolean) => void;
  };
};

export function ReservationPolicyConsent({ field }: Props) {
  return (
    <FormItem
      data-testid="policies-consent"
      className="flex flex-row items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 px-4 py-4 shadow-sm"
    >
      <FormControl>
        <Checkbox
          id="policiesAccepted"
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          className="size-6 border-amber-400 data-[state=checked]:bg-amber-500"
        />
      </FormControl>
      <div className="space-y-1">
        <FormLabel htmlFor="policiesAccepted" className="text-sm font-semibold text-foreground">
          Je confirme avoir pris connaissance de la{" "}
          <Link
            href="/politique-de-confidentialite"
            className="font-semibold text-primary underline"
          >
            politique de confidentialité
          </Link>{" "}
          et des{" "}
          <Link href="/mentions-legales" className="font-semibold text-primary underline">
            mentions légales
          </Link>
          .
        </FormLabel>
        <FormMessage />
      </div>
    </FormItem>
  );
}
