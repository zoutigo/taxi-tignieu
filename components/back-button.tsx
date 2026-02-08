"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  label?: string;
  href?: string;
  "data-testid"?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

export function BackButton({
  label = "Retour",
  href,
  variant = "outline",
  className,
  "data-testid": dataTestId,
}: Props) {
  const router = useRouter();

  return (
    <Button
      variant={variant}
      className={`group inline-flex items-center gap-2 cursor-pointer ${className ?? ""}`}
      data-testid={dataTestId}
      onClick={() => {
        if (href) {
          router.push(href);
        } else {
          router.back();
        }
      }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-primary/20 group-hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
      </span>
      <span className="font-semibold">{label}</span>
    </Button>
  );
}
