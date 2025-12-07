import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";

type Variant = "success" | "error" | "info";

const variantStyle: Record<Variant, { bg: string; text: string; Icon: typeof CheckCircle2 }> = {
  success: { bg: "bg-emerald-100", text: "text-emerald-800", Icon: CheckCircle2 },
  error: { bg: "bg-rose-100", text: "text-rose-800", Icon: AlertTriangle },
  info: { bg: "bg-sky-100", text: "text-sky-900", Icon: Info },
};

type Props = {
  variant?: Variant;
  children: React.ReactNode;
};

export function AppMessage({ variant = "info", children }: Props) {
  const { bg, text, Icon } = variantStyle[variant];
  return (
    <div className={clsx("flex items-center gap-2 rounded-md px-3 py-2 text-sm", bg, text)}>
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </div>
  );
}
