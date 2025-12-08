import ServiceDetailPage from "@/app/services/[slug]/page";

export default function BonusPage() {
  return ServiceDetailPage({ params: { slug: "bonus" } });
}
