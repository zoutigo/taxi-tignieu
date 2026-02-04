"use client";

import { AddressActionButton } from "@/components/ui/address-action-button";
import { BackButton } from "@/components/back-button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  showCreate?: boolean;
  createHref?: string;
  backHref?: string;
  backLabel?: string;
  "data-testid"?: string;
};

export default function FeaturedTripsActions({
  showCreate = true,
  createHref = "/dashboard/featured-trips/new",
  backHref = "/dashboard/featured-trips",
  backLabel = "Retour aux trajets",
  "data-testid": dataTestId,
}: Props) {
  const router = useRouter();
  return (
    <div className="flex w-full items-center justify-end gap-3" data-testid={dataTestId}>
      <BackButton label={backLabel} href={backHref} />
      {showCreate ? (
        <AddressActionButton
          icon={Plus}
          label="Créer un trajet"
          variant="search"
          onClick={() => router.push(createHref)}
        />
      ) : null}
    </div>
  );
}
