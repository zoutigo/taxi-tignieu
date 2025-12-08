import ServiceDetailPage from "@/app/services/[slug]/page";

export default function PremiumPage() {
  return ServiceDetailPage({ params: { slug: "premium" } });
}
