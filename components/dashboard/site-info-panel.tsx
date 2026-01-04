"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppMessage } from "@/components/app-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ContactForm = {
  name?: string;
  ownerName?: string;
  siret?: string;
  ape?: string;
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

type Props = {
  initialContact: ContactForm | null;
};

export function SiteInfoPanel({ initialContact }: Props) {
  const [contact, setContact] = useState<ContactForm>(
    initialContact ?? {
      name: "",
      ownerName: "",
      siret: "",
      ape: "",
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

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

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Informations du site</h2>
          <p className="text-sm text-muted-foreground">
            Ces informations alimentent le footer et les pages légales.
          </p>
        </div>
        <Button variant="outline" className="cursor-pointer" onClick={() => setEditing((v) => !v)}>
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
              <span className="font-semibold text-foreground">Nom du site :</span>{" "}
              {contact.name || "—"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Responsable :</span>{" "}
              {contact.ownerName || "—"}
            </p>
            <p>
              <span className="font-semibold text-foreground">SIRET :</span> {contact.siret || "—"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Code APE :</span> {contact.ape || "—"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Téléphone :</span>{" "}
              {contact.phone || "—"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Email :</span> {contact.email || "—"}
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
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Nom du site</span>
              <Input
                value={contact.name ?? ""}
                onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Responsable</span>
              <Input
                value={contact.ownerName ?? ""}
                onChange={(e) => setContact((prev) => ({ ...prev, ownerName: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">SIRET</span>
              <Input
                value={contact.siret ?? ""}
                onChange={(e) => setContact((prev) => ({ ...prev, siret: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Code APE</span>
              <Input
                value={contact.ape ?? ""}
                onChange={(e) => setContact((prev) => ({ ...prev, ape: e.target.value }))}
              />
            </label>
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
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              className="cursor-pointer"
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
  );
}
