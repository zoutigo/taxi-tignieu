"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadPaginationSettings,
  paginationDefaults,
  savePaginationSettings,
} from "@/lib/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ContactForm = {
  phone: string;
  email: string;
  address: {
    street: string;
    streetNumber?: string;
    postalCode: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
};

type TariffForm = {
  baseCharge: number;
  kmA: number;
  kmB: number;
  kmC: number;
  kmD: number;
  waitPerHour: number;
  baggageFee: number;
  fifthPassenger: number;
};

type Props = {
  initialContact: ContactForm | null;
  initialTariff: TariffForm;
};

export function SettingsPanel({ initialContact, initialTariff }: Props) {
  const [pagination, setPagination] = useState(() => loadPaginationSettings());
  const [contact, setContact] = useState<ContactForm>(
    initialContact ?? {
      phone: "",
      email: "",
      address: {
        street: "",
        streetNumber: "",
        postalCode: "",
        city: "",
        country: "",
      },
    }
  );
  const [tariff, setTariff] = useState<TariffForm>(initialTariff);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingTariff, setSavingTariff] = useState(false);
  const [editingTariff, setEditingTariff] = useState(false);
  const tariffFields: Array<{ key: keyof TariffForm; label: string }> = [
    { key: "baseCharge", label: "Prise en charge" },
    { key: "waitPerHour", label: "Attente / heure" },
    { key: "kmA", label: "Tarif A (km)" },
    { key: "kmB", label: "Tarif B (km)" },
    { key: "kmC", label: "Tarif C (km)" },
    { key: "kmD", label: "Tarif D (km)" },
    { key: "baggageFee", label: "Supplément bagage" },
    { key: "fifthPassenger", label: "Supplément 5ᵉ passager" },
  ];

  useEffect(() => {
    savePaginationSettings(pagination);
  }, [pagination]);

  const updatePagination = (key: keyof typeof pagination, value: number) => {
    const next = Math.max(1, value || paginationDefaults[key]);
    setPagination((prev) => ({ ...prev, [key]: next }));
  };

  const submitContact = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    if (!res.ok) {
      setError("Échec de sauvegarde des informations.");
      setSaving(false);
      return;
    }
    setMessage("Informations mises à jour.");
    setSaving(false);
    setTimeout(() => setMessage(null), 2500);
  };

  const submitTariff = async () => {
    setSavingTariff(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/tarifs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseCharge: tariff.baseCharge,
        kmA: tariff.kmA,
        kmB: tariff.kmB,
        kmC: tariff.kmC,
        kmD: tariff.kmD,
        waitPerHour: tariff.waitPerHour,
        baggageFee: tariff.baggageFee,
        fifthPassenger: tariff.fifthPassenger,
      }),
    });
    if (!res.ok) {
      setError("Échec de sauvegarde des tarifs.");
      setSavingTariff(false);
      return;
    }
    setMessage("Tarifs mis à jour.");
    setSavingTariff(false);
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Pagination des tableaux</h2>
        <p className="text-sm text-muted-foreground">
          Valeurs sauvegardées dans votre navigateur pour les sections dashboard.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["bookings", "avis", "users"] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {key === "bookings" ? "Réservations" : key === "avis" ? "Avis" : "Utilisateurs"}
              </span>
              <Input
                type="number"
                min={1}
                value={pagination[key]}
                onChange={(e) => updatePagination(key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Paramètres tarifaires</h2>
            <p className="text-sm text-muted-foreground">
              Base de calcul utilisée pour le tarif estimatif (page Réserver) ; valeurs en €.
            </p>
          </div>
          <Button variant="outline" onClick={() => setEditingTariff((v) => !v)}>
            {editingTariff ? "Fermer" : "Modifier"}
          </Button>
        </div>

        {!editingTariff ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Aperçu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <p>
                <span className="font-semibold text-foreground">Prise en charge :</span>{" "}
                {tariff.baseCharge.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-foreground">Attente /h :</span>{" "}
                {tariff.waitPerHour.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-foreground">Tarif A km :</span>{" "}
                {tariff.kmA.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-foreground">Tarif B km :</span>{" "}
                {tariff.kmB.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-foreground">Tarif C km :</span>{" "}
                {tariff.kmC.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-foreground">Tarif D km :</span>{" "}
                {tariff.kmD.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-foreground">Bagage :</span>{" "}
                {tariff.baggageFee.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-foreground">5ᵉ passager :</span>{" "}
                {tariff.fifthPassenger.toFixed(2)} €
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {tariffFields.map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={tariff[key].toString()}
                    onChange={(e) =>
                      setTariff((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setEditingTariff(false)}
                disabled={savingTariff}
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  await submitTariff();
                  setEditingTariff(false);
                }}
                disabled={savingTariff}
              >
                Sauvegarder
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Informations de contact (footer)
            </h2>
            <p className="text-sm text-muted-foreground">
              Ces informations alimentent le footer du site. Cliquez sur modifier pour mettre à
              jour.
            </p>
          </div>
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Fermer" : "Modifier"}
          </Button>
        </div>

        {!editing ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Aperçu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Téléphone :</span>{" "}
                {contact.phone || "—"}
              </p>
              <p>
                <span className="font-semibold text-foreground">Email :</span>{" "}
                {contact.email || "—"}
              </p>
              <p>
                <span className="font-semibold text-foreground">Adresse :</span>{" "}
                {[
                  contact.address.streetNumber,
                  contact.address.street,
                  contact.address.postalCode,
                  contact.address.city,
                  contact.address.country,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <p className="text-xs">
                Lat: {contact.address.latitude ?? "—"} · Lng: {contact.address.longitude ?? "—"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Téléphone</span>
                <Input
                  value={contact.phone}
                  onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Email</span>
                <Input
                  value={contact.email}
                  onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Rue</span>
                <Input
                  value={contact.address.street}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Numéro</span>
                <Input
                  value={contact.address.streetNumber ?? ""}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      address: { ...prev.address, streetNumber: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Code postal</span>
                <Input
                  value={contact.address.postalCode}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      address: { ...prev.address, postalCode: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Ville</span>
                <Input
                  value={contact.address.city}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Pays</span>
                <Input
                  value={contact.address.country}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      address: { ...prev.address, country: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Latitude (optionnel)</span>
                <Input
                  type="number"
                  value={contact.address.latitude ?? ""}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        latitude: e.target.value ? Number(e.target.value) : undefined,
                      },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Longitude (optionnel)</span>
                <Input
                  type="number"
                  value={contact.address.longitude ?? ""}
                  onChange={(e) =>
                    setContact((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        longitude: e.target.value ? Number(e.target.value) : undefined,
                      },
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  await submitContact();
                  setEditing(false);
                }}
                disabled={saving}
              >
                Sauvegarder
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
