import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
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
  onClose?: () => void;
};

export function AppMessage({ variant = "info", children, onClose }: Props) {
  const { bg, text, Icon } = variantStyle[variant];
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        bg,
        text,
        onClose ? "pr-2" : ""
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{children}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-current transition hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current cursor-pointer"
          aria-label="Fermer le message"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
