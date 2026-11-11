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
  const product = await api.getProductDetail(slug);

  if (!product) {
    return buildPageMetadata({
      title: "Product Not Found | Giftlaya",
      description: "The requested product could not be found on Giftlaya.",
      index: false,
      follow: false,
    });
  }

  return buildPageMetadata({
    title: `Buy ${product.title} @ ₹${product.price} | Fast Delivery | Giftlaya`,
    description: `Buy ${product.title} online from ₹${product.price}. Same-day and midnight delivery in 100+ cities across India. Order online in a couple of minutes.`,
    path: `/p/${slug}`,
    image: product.image
      ? {
          url: product.image,
          width: 800,
          height: 800,
          alt: product.title,
        }
      : null,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await api.getProductDetail(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailView product={product} />;
}
