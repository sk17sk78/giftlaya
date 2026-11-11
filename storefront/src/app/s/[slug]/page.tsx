import { api } from "@/services/api";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/product/ProductDetailView";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await api.getServiceDetail(slug);

  if (!service) {
    return buildPageMetadata({
      title: "Decoration Package Not Found | Giftlaya",
      description: "The requested decoration package could not be found on Giftlaya.",
      index: false,
      follow: false,
    });
  }

  return buildPageMetadata({
    title: `Book ${service.title} @ ₹${service.price} | Same-Day Setup | Giftlaya`,
    description: `Book ${service.title} from ₹${service.price}. Set up at your venue by a trained decorator. Material, setup and cleanup included.`,
    path: `/s/${slug}`,
    image: service.image
      ? {
          url: service.image,
          width: 800,
          height: 800,
          alt: service.title,
        }
      : null,
  });
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await api.getServiceDetail(slug);

  if (!service) {
    notFound();
  }

  return <ProductDetailView product={service} />;
}

