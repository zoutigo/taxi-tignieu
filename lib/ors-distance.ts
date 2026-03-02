export type Coord = { lat: number; lng: number };

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const SNAP_RADII_METERS = [500, 700, 1000] as const;

type OrsParsed = {
  features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }>;
  routes?: Array<{ summary?: { distance?: number; duration?: number } }>;
};

export async function getOrsDrivingDistance(
  from: Coord,
  to: Coord
): Promise<{
  distanceKm: number;
  durationMinutes: number;
}> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTESERVICE_API_KEY manquante côté serveur.");
  }

  let lastError = "Erreur ORS inconnue";
  for (const radius of SNAP_RADII_METERS) {
    let response: Response;
    let raw = "";
    try {
      response = await fetch(ORS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          coordinates: [
            [Number(from.lng), Number(from.lat)],
            [Number(to.lng), Number(to.lat)],
          ],
          radiuses: [radius, radius],
        }),
      });
      raw = await response.text();
    } catch (error) {
      throw new Error(`Échec de communication avec OpenRouteService: ${String(error)}`);
    }

    if (!response.ok) {
      const details = raw.slice(0, 800);
      lastError = `OpenRouteService a rejeté la requête (HTTP ${response.status}, radius=${radius}m): ${details}`;
      const maybeUnroutablePoint =
        response.status === 404 &&
        /routable point|could not find routable point|radius/i.test(details);
      const canRetry =
        maybeUnroutablePoint && radius !== SNAP_RADII_METERS[SNAP_RADII_METERS.length - 1];
      if (canRetry) continue;
      throw new Error(lastError);
    }

    let parsed: OrsParsed;
    try {
      parsed = JSON.parse(raw) as OrsParsed;
    } catch {
      throw new Error(
        `Réponse OpenRouteService invalide (JSON, radius=${radius}m): ${raw.slice(0, 800)}`
      );
    }

    const summary = parsed.features?.[0]?.properties?.summary ?? parsed.routes?.[0]?.summary;
    const distanceKm = Number(summary?.distance) / 1000;
    const durationMinutes = Number(summary?.duration) / 60;
    if (!Number.isFinite(distanceKm) || !Number.isFinite(durationMinutes)) {
      throw new Error(
        `Réponse OpenRouteService incomplète (distance/durée absentes, radius=${radius}m): ${raw.slice(0, 800)}`
      );
    }

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.round(durationMinutes),
    };
  }

  throw new Error(lastError);
}
