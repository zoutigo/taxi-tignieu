import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réserver un taxi | Taxi Tignieu",
  description: "Calculez votre tarif et réservez votre trajet avec Taxi Tignieu.",
};

export default function ReserverPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3 text-center">
        <span className="badge-pill text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Réserver
        </span>
        <h1 className="font-display text-4xl text-foreground">Estimez et réservez votre course</h1>
        <p className="text-base text-muted-foreground">
          Obtenez une estimation indicative, puis confirmez la réservation avec notre équipe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <form className="card space-y-4">
          <div>
            <label className="text-sm font-semibold text-muted-foreground">
              Lieu de prise en charge
            </label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none dark:bg-card/70"
              placeholder="24 rue de la Gare, Tignieu"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground">Destination</label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none dark:bg-card/70"
              placeholder="Aéroport Saint-Exupéry"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-muted-foreground">Date</label>
              <input
                type="date"
                className="mt-2 w-full rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-base text-foreground focus:border-ring focus:outline-none dark:bg-card/70"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground">Heure</label>
              <input
                type="time"
                className="mt-2 w-full rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-base text-foreground focus:border-ring focus:outline-none dark:bg-card/70"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-muted-foreground">Passagers</label>
              <select className="mt-2 w-full rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-base text-foreground focus:border-ring focus:outline-none dark:bg-card/70">
                {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                  <option key={count} value={count}>
                    {count} {count > 1 ? "passagers" : "passager"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground">Bagages</label>
              <select className="mt-2 w-full rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-base text-foreground focus:border-ring focus:outline-none dark:bg-card/70">
                {[0, 1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count} {count > 1 ? "bagages" : "bagage"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground">Message</label>
            <textarea
              rows={4}
              className="mt-2 w-full rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none dark:bg-card/70"
              placeholder="Précisions, options, n° de vol..."
            />
          </div>

          <button type="button" className="btn btn-primary w-full">
            Obtenir une estimation
          </button>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-border/80 bg-card px-6 py-6 shadow-[0_35px_55px_rgba(5,15,35,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Estimation indicative
            </p>
            <div className="mt-6 rounded-2xl bg-muted/50 px-5 py-4 text-sm text-muted-foreground">
              En attendant la connexion au back-office, cette estimation est uniquement
              illustrative.
            </div>
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p>Course de jour 7h-19h : à partir de 35 €</p>
              <p>Course de nuit / dimanche : +15 %</p>
              <p>Van 6-7 places : +12 €</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/80 bg-sidebar px-6 py-8 text-sidebar-foreground shadow-[0_35px_55px_rgba(2,8,32,0.3)]">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70">
              Besoin d&apos;aide ?
            </p>
            <h2 className="mt-4 font-display text-2xl">Réservation assistée</h2>
            <p className="mt-3 text-sm text-white/80">
              Notre équipe vous répond 24/7 pour ajuster le trajet ou confirmer votre réservation.
            </p>
            <div className="mt-6 space-y-2 text-sm text-white/90">
              <p>☎ 04 95 78 54 00</p>
              <p>✉ contact@taxitignieu.fr</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
