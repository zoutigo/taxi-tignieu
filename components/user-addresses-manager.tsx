"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Star, Trash2 } from "lucide-react";
import type { Address, UserAddress } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { userAddressSchema } from "@/schemas/profile";
import { cn } from "@/lib/utils";
import { fetchAddressData, type AddressData } from "@/lib/booking-utils";
import { normalizeAddressSuggestion } from "@/lib/address-search";
import { AddressAutocomplete } from "@/components/address-autocomplete";

type SavedAddress = UserAddress & {
  address: Address;
  isDefault: boolean;
};

const createSchema = userAddressSchema.extend({
  setDefault: z.boolean().optional(),
});

type FormValues = z.infer<typeof createSchema>;

const formatAddressLine = (addr: Address) => {
  const parts = [addr.streetNumber, addr.street, addr.postalCode, addr.city, addr.country].filter(
    Boolean
  );
  return parts.join(" ").trim();
};

export function UserAddressesManager({ initialAddresses }: { initialAddresses: SavedAddress[] }) {
  const [addresses, setAddresses] = useState<SavedAddress[]>(initialAddresses);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [lockedFields, setLockedFields] = useState(false);

  const hasDefault = useMemo(() => addresses.some((addr) => addr.isDefault), [addresses]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema) as Resolver<FormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      label: "",
      name: "",
      streetNumber: "",
      street: "",
      postalCode: "",
      city: "",
      country: "France",
      latitude: null,
      longitude: null,
      setDefault: !hasDefault,
    },
  });

  useEffect(() => {
    if (!hasDefault) {
      form.setValue("setDefault", true);
    }
  }, [hasDefault, form]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setFormError(null);
    setLockedFields(false);
    form.setValue("latitude", null, { shouldDirty: true, shouldValidate: true });
    form.setValue("longitude", null, { shouldDirty: true, shouldValidate: true });
  };

  const applySuggestion = (s: AddressData) => {
    const normalized = normalizeAddressSuggestion(s);
    const streetNumber = normalized.streetNumber ?? "";
    const street = normalized.street ?? "";
    const withCountry =
      normalized.country &&
      !normalized.label.toLowerCase().includes((normalized.country ?? "").toLowerCase())
        ? `${normalized.label}, ${normalized.country}`
        : normalized.label;
    setFormError(null);
    setLockedFields(true);
    form.setValue("streetNumber", streetNumber, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("street", street, { shouldDirty: true, shouldValidate: true });
    form.setValue("postalCode", normalized.postcode ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("city", normalized.city ?? "", { shouldDirty: true, shouldValidate: true });
    form.setValue("country", normalized.country ?? form.getValues("country") ?? "France", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("name", normalized.name ?? "", { shouldDirty: true, shouldValidate: true });
    form.setValue("latitude", normalized.lat ?? null, { shouldDirty: true, shouldValidate: true });
    form.setValue("longitude", normalized.lng ?? null, { shouldDirty: true, shouldValidate: true });
    setSearchValue(withCountry);
    void form.trigger();
  };

  const ensureCoordinates = async () => {
    const currentLat = form.getValues("latitude");
    const currentLng = form.getValues("longitude");
    if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
      return { lat: currentLat as number, lng: currentLng as number };
    }
    const queryFromFields =
      `${form.getValues("streetNumber") ?? ""} ${form.getValues("street") ?? ""} ${
        form.getValues("postalCode") ?? ""
      } ${form.getValues("city") ?? ""}`.trim();
    const query = searchValue.trim().length > 0 ? searchValue : queryFromFields;
    const fetched = await fetchAddressData(query);
    if (!Number.isFinite(fetched.lat) || !Number.isFinite(fetched.lng)) {
      throw new Error("Sélectionnez une adresse dans la liste pour enregistrer les coordonnées.");
    }
    form.setValue("streetNumber", fetched.streetNumber ?? form.getValues("streetNumber") ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("street", fetched.street ?? form.getValues("street") ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("postalCode", fetched.postcode ?? form.getValues("postalCode") ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("city", fetched.city ?? form.getValues("city") ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("country", fetched.country ?? form.getValues("country") ?? "France", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("latitude", fetched.lat, { shouldDirty: true, shouldValidate: true });
    form.setValue("longitude", fetched.lng, { shouldDirty: true, shouldValidate: true });
    return { lat: fetched.lat, lng: fetched.lng };
  };

  const onSubmit = form.handleSubmit(async () => {
    setFormError(null);
    setFormSuccess(null);
    setLoadingId("create");

    try {
      await ensureCoordinates();
      const updated = form.getValues();
      const payload = {
        ...updated,
        setDefault: updated.setDefault ?? !hasDefault,
      };
      const res = await fetch("/api/profile/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Impossible d'enregistrer cette adresse.");
      }

      const newAddress = data.savedAddress as SavedAddress;
      let nextHasDefault = false;

      setAddresses((prev) => {
        const base = newAddress.isDefault
          ? prev.map((addr) => ({ ...addr, isDefault: false }))
          : prev;
        const next = [newAddress, ...base];
        nextHasDefault = next.some((addr) => addr.isDefault);
        return next;
      });

      form.reset({
        label: "",
        name: "",
        streetNumber: "",
        street: "",
        postalCode: "",
        city: "",
        country: updated.country ?? "France",
        latitude: null,
        longitude: null,
        setDefault: !nextHasDefault,
      });
      setSearchValue("");
      setLockedFields(false);
      setFormSuccess("Adresse enregistrée.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoadingId(null);
    }
  });

  const setAsDefault = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/profile/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setDefault: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Impossible de mettre à jour cette adresse.");
      }
      const updated = data.address as SavedAddress;
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr.id === updated.id,
        }))
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoadingId(null);
    }
  };

  const removeAddress = async (address: SavedAddress) => {
    setLoadingId(address.id);
    try {
      const res = await fetch(`/api/profile/addresses/${address.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Impossible de supprimer cette adresse.");
      }
      const nextDefaultId = data?.defaultAddressId ?? null;
      setAddresses((prev) =>
        prev
          .filter((addr) => addr.id !== address.id)
          .map((addr) => ({
            ...addr,
            isDefault: nextDefaultId ? addr.id === nextDefaultId : false,
          }))
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-border/80 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Ajouter une adresse</CardTitle>
          <CardDescription>
            Sauvegardez vos lieux fréquents pour les retrouver plus vite lors de vos réservations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <FormLabel>Rechercher une adresse</FormLabel>
                <AddressAutocomplete
                  value={searchValue}
                  placeholder="12 Rue de la République, 69000 Lyon"
                  onChange={(val) => handleSearchChange(val)}
                  onSelect={(addr) => applySuggestion(addr)}
                  disabled={form.formState.isSubmitting}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                <FormField
                  control={form.control}
                  name="streetNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12"
                          className="text-base"
                          {...field}
                          value={field.value ?? ""}
                          disabled={form.formState.isSubmitting}
                          readOnly={lockedFields}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>Rue</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rue de l'Église"
                          className="text-base"
                          {...field}
                          value={field.value ?? ""}
                          disabled={form.formState.isSubmitting}
                          readOnly={lockedFields}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="38230"
                          className="text-base"
                          {...field}
                          value={field.value ?? ""}
                          disabled={form.formState.isSubmitting}
                          readOnly={lockedFields}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tignieu-Jameyzieu"
                          className="text-base"
                          {...field}
                          value={field.value ?? ""}
                          disabled={form.formState.isSubmitting}
                          readOnly={lockedFields}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="France"
                          className="text-base"
                          {...field}
                          value={field.value ?? ""}
                          disabled={form.formState.isSubmitting}
                          readOnly={lockedFields}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Complément (bâtiment, société, étage...)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Résidence des Cèdres, Bât B"
                          className="text-base"
                          {...field}
                          value={field.value ?? ""}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Définir par défaut</p>
                    <p className="text-xs text-muted-foreground">
                      Utilisée en priorité pour vos futures réservations.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="setDefault"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="cursor-pointer"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l&apos;adresse</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Maison, Boulot, Aéroport..."
                          className="text-base"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Choisissez un nom (ex. « Boulot »). Il n&apos;est pas rempli
                        automatiquement.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              {formSuccess ? <p className="text-sm text-emerald-600">{formSuccess}</p> : null}

              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={loadingId === "create" || !form.formState.isValid}
              >
                {loadingId === "create" ? "Enregistrement..." : "Enregistrer l'adresse"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Mes adresses</CardTitle>
          <CardDescription>
            Gérez vos adresses favorites et choisissez celle utilisée par défaut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {addresses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
              Ajoutez votre première adresse pour la retrouver en un clic.
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm transition",
                    addr.isDefault ? "ring-2 ring-primary/40" : ""
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {addr.isDefault ? (
                          <Star className="h-4 w-4" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{addr.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAddressLine(addr.address)}
                        </p>
                        {addr.address.name ? (
                          <p className="text-xs text-muted-foreground">{addr.address.name}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!addr.isDefault ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          disabled={loadingId === addr.id}
                          onClick={() => setAsDefault(addr.id)}
                        >
                          {loadingId === addr.id ? "..." : "Par défaut"}
                        </Button>
                      ) : (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          Adresse par défaut
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive cursor-pointer"
                        disabled={loadingId === addr.id}
                        onClick={() => setPendingDelete(addr)}
                        aria-label={`Supprimer ${addr.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeAddress(pendingDelete)}
        title="Supprimer cette adresse ?"
        message="Elle ne sera plus proposée lors de vos prochaines réservations."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
      />
    </div>
  );
}
