import { prisma } from "@/lib/prisma";
import { TariffPanel } from "@/components/dashboard/tariff-panel";
import { defaultTariffConfig } from "@/lib/tarifs";
import { BackButton } from "@/components/back-button";
import {
  getLatestTariffRecomputeJob,
  getTariffRecomputeJobIssues,
} from "@/lib/tariff-recompute-queue";

export default async function TarifsPage() {
  const [tariff, latestJob] = await Promise.all([
    prisma.tariffConfig.findFirst({ orderBy: { updatedAt: "desc" } }),
    getLatestTariffRecomputeJob(),
  ]);
  const latestIssues = latestJob ? await getTariffRecomputeJobIssues(latestJob.id, 8) : [];

  const initialTariff = tariff
    ? {
        baseCharge: tariff.baseChargeCents / 100,
        kmA: tariff.kmCentsA / 100,
        kmB: tariff.kmCentsB / 100,
        kmC: tariff.kmCentsC / 100,
        kmD: tariff.kmCentsD / 100,
        waitPerHour: tariff.waitPerHourCents / 100,
        baggageFee: tariff.baggageFeeCents / 100,
        fifthPassenger: tariff.fifthPassengerCents / 100,
      }
    : {
        baseCharge: defaultTariffConfig.baseChargeCents / 100,
        kmA: defaultTariffConfig.kmCentsA / 100,
        kmB: defaultTariffConfig.kmCentsB / 100,
        kmC: defaultTariffConfig.kmCentsC / 100,
        kmD: defaultTariffConfig.kmCentsD / 100,
        waitPerHour: defaultTariffConfig.waitPerHourCents / 100,
        baggageFee: defaultTariffConfig.baggageFeeCents / 100,
        fifthPassenger: defaultTariffConfig.fifthPassengerCents / 100,
      };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Paramètres tarifaires</h1>
      <p className="text-sm text-muted-foreground">
        Ajustez les valeurs utilisées pour les estimations de prix et la facturation.
      </p>
      <div className="mt-4">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
      <div className="mt-6">
        <TariffPanel initialTariff={initialTariff} />
      </div>

      <section className="mt-6 rounded-2xl border border-border/70 bg-card p-5 text-sm shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Recalcul asynchrone des trajets</h2>
        <p className="mt-2 text-muted-foreground">
          Chaque modification de grille crée un job SQL traité par lots via le cron.
        </p>
        {latestJob ? (
          <div className="mt-3 space-y-1 text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Statut :</span> {latestJob.status}
            </p>
            <p>
              <span className="font-semibold text-foreground">Progression :</span>{" "}
              {latestJob.doneItems}/{latestJob.totalItems} traités
              {latestJob.failedItems > 0 ? ` • ${latestJob.failedItems} en erreur` : ""}
            </p>
            <p>
              <span className="font-semibold text-foreground">Job ID :</span> {latestJob.id}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-muted-foreground">Aucun job de recalcul enregistré.</p>
        )}
        {latestIssues.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-3">
            <p className="font-semibold text-foreground">Items en erreur / retry</p>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {latestIssues.map((issue) => (
                <li
                  key={issue.itemId}
                  className="rounded-md border border-border/60 bg-card px-3 py-2"
                >
                  <p>
                    <span className="font-semibold text-foreground">Trajet :</span>{" "}
                    {issue.pickupLabel ?? "Départ inconnu"} →{" "}
                    {issue.dropoffLabel ?? "Arrivée inconnue"}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Statut :</span> {issue.status} •
                    tentative {issue.attempts}
                  </p>
                  {issue.nextAttemptAt ? (
                    <p>
                      <span className="font-semibold text-foreground">Prochain essai :</span>{" "}
                      {new Date(issue.nextAttemptAt).toLocaleString("fr-FR")}
                    </p>
                  ) : null}
                  {issue.lastError ? (
                    <p className="text-xs text-destructive">{issue.lastError}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-border/70 bg-card p-5 text-sm shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Aide sur les champs tarifaires</h2>
        <p className="mt-2 text-muted-foreground">
          Ces valeurs servent au calcul du devis dans{" "}
          <span className="font-semibold">/reserver</span> et au recalcul des trajets mis en avant.
        </p>
        <ul className="mt-4 space-y-2 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">Prise en charge</span> : montant fixe
            ajouté au début de chaque course.
          </li>
          <li>
            <span className="font-semibold text-foreground">Tarif A (km)</span> : jour semaine,
            créneau 7h-19h.
          </li>
          <li>
            <span className="font-semibold text-foreground">Tarif B (km)</span> : nuit, dimanche et
            jours fériés.
          </li>
          <li>
            <span className="font-semibold text-foreground">Tarif C (km)</span> : tarif gare jour.
          </li>
          <li>
            <span className="font-semibold text-foreground">Tarif D (km)</span> : tarif gare nuit.
          </li>
          <li>
            <span className="font-semibold text-foreground">Attente / heure</span> : coût ajouté
            pour le temps d’attente.
          </li>
          <li>
            <span className="font-semibold text-foreground">Supplément bagage</span> : coût unitaire
            par bagage comptabilisé.
          </li>
          <li>
            <span className="font-semibold text-foreground">Supplément 5ᵉ passager</span> : coût
            ajouté si le nombre de passagers dépasse 4.
          </li>
        </ul>
        <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-amber-900">
          <p className="font-semibold">Règle devis active</p>
          <p className="mt-1">
            Le devis <span className="font-semibold">/api/forecast/quote</span> applique
            actuellement <span className="font-semibold">Tarif C de jour</span> et{" "}
            <span className="font-semibold">Tarif D de nuit</span>, avec{" "}
            <span className="font-semibold">1 bagage minimum inclus</span>.
          </p>
        </div>
      </section>

      <div className="mt-8">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
    </div>
  );
}
