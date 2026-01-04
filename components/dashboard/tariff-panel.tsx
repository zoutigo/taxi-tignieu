"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppMessage } from "@/components/app-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  initialTariff: TariffForm;
};

export function TariffPanel({ initialTariff }: Props) {
  const [tariff, setTariff] = useState<TariffForm>(initialTariff);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
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

  const submitTariff = async () => {
    setSaving(true);
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
      setSaving(false);
      return;
    }
    setMessage("Tarifs mis à jour.");
    setSaving(false);
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Paramètres tarifaires</h2>
          <p className="text-sm text-muted-foreground">
            Base de calcul utilisée pour le tarif estimatif (page Réserver) ; valeurs en €.
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
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                await submitTariff();
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
