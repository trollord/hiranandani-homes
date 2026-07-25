import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import PropertyMapSection from "@/components/map/PropertyMapSection";
import InquiryButton from "@/components/payment/InquiryButton";
import PropertyGallery from "@/components/property/PropertyGallery";
import { WhatsAppShareButton } from "@/components/property/WhatsAppShare";
import {
  MapPin,
  BedDouble,
  CalendarClock,
  Bath,
  Maximize2,
  Building2,
  Wifi,
  Car,
  Dumbbell,
  ShieldCheck,
  Droplets,
  Wind,
  Zap,
  Trees,
} from "lucide-react";
import {
  formatPrice,
  formatArea,
  formatDate,
  parseAmenities,
} from "@/lib/utils/formatters";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  FURNISHED_LABELS,
} from "@/lib/constants";
import type { Metadata } from "next";

export const revalidate = 3600;

// cache() dedupes the query between generateMetadata and the page render
const getProperty = cache(async (id: string) => {
  return prisma.property.findUnique({
    where: { id, status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      listingType: true,
      building: true,
      address: true,
      locality: true,
      bedrooms: true,
      bathrooms: true,
      areaSqft: true,
      floor: true,
      totalFloors: true,
      furnished: true,
      amenities: true,
      price: true,
      deposit: true,
      rentNegotiable: true,
      lockInMonths: true,
      lockInNegotiable: true,
      availableFrom: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      images: {
        select: { id: true, url: true, isPrimary: true },
        orderBy: { isPrimary: "desc" },
      },
      priceHistory: {
        select: { price: true, recordedAt: true, source: true },
        orderBy: { recordedAt: "asc" },
      },
      owner: { select: { id: true, name: true, image: true } },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) return { title: "Property Not Found" };

  return {
    title: property.title,
    description: property.description.slice(0, 160),
    openGraph: {
      title: property.title,
      images: property.images[0] ? [property.images[0].url] : [],
    },
  };
}

/* ── Amenity icon mapping ── */
const AMENITY_ICONS: Record<string, React.ElementType> = {
  "High-speed Wifi": Wifi,
  "Wi-Fi": Wifi,
  WiFi: Wifi,
  "Covered Parking": Car,
  Parking: Car,
  "Private Gym": Dumbbell,
  Gym: Dumbbell,
  "24x7 Security": ShieldCheck,
  "24/7 Security": ShieldCheck,
  Security: ShieldCheck,
  "Swimming Pool": Droplets,
  "Infinity Pool": Droplets,
  Pool: Droplets,
  "Air Conditioning": Wind,
  "Laundry Service": Wind,
  AC: Wind,
  "Power Backup": Zap,
  Garden: Trees,
};

function getAmenityIcon(name: string) {
  return AMENITY_ICONS[name] ?? ShieldCheck;
}

/* ── Section label ── */
function SectionLabel({ title, compact, withLine }: { title: string; compact?: boolean; withLine?: boolean }) {
  return (
    <div className={`flex items-center gap-4 mb-5 sm:mb-8 ${compact ? "mt-0" : "mt-10 sm:mt-16"}`}>
      <p className="text-[11px] sm:text-[13px] font-bold tracking-[0.25em] text-[#1A1A1A]/80 uppercase shrink-0">{title}</p>
      {withLine && <div className="flex-1 h-px bg-[#1A1A1A]/20" />}
    </div>
  );
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ showInterest?: string }>;
}) {
  const [{ id }, resolvedSearch] = await Promise.all([params, searchParams]);
  const [property, session] = await Promise.all([getProperty(id), auth()]);

  if (!property) notFound();

  // View counter + registration check in parallel — one DB round-trip of
  // latency instead of two, and a failed count never blocks the page
  const [inquiry] = await Promise.all([
    session?.user?.id
      ? prisma.inquiry.findUnique({
          where: {
            propertyId_seekerId: { propertyId: id, seekerId: session.user.id },
          },
          select: { status: true },
        })
      : Promise.resolve(null),
    prisma.property
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => {}),
  ]);
  const hasRegistered = inquiry != null;

  const isRent = property.listingType === "RENT";

  const galleryImages = property.images;

  const amenities = parseAmenities(property.amenities);

  const availability =
    property.availableFrom === "IMMEDIATE"
      ? { label: "Ready to Move", immediate: true }
      : property.availableFrom
      ? {
          label: new Date(`${property.availableFrom}T00:00:00`).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          immediate: false,
        }
      : null;

  /* Split title for italic portion after comma */
  const titleParts = property.title.split(",");
  const mainTitle = titleParts[0];
  const italicTitle =
    titleParts.length > 1 ? ", " + titleParts.slice(1).join(",").trim() : null;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero Gallery ──────────────────────────────────────────────────── */}
      <div className="pt-[72px] sm:pt-[84px] max-w-6xl mx-auto px-3 sm:px-6 lg:px-10">
        <PropertyGallery images={galleryImages} title={property.title} />
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">

        {/* ── Title row + Price Card ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 lg:gap-12 items-start mt-6 sm:mt-10">

          {/* Left: Badges + Title + Location */}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase bg-[#0B0B0C] text-white px-3 py-1 rounded-full">
                For {LISTING_TYPE_LABELS[property.listingType]}
              </span>
              {[PROPERTY_TYPE_LABELS[property.type], FURNISHED_LABELS[property.furnished]].map(
                (label) => (
                  <span
                    key={label}
                    className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#0B0B0C]/70 bg-[#f2f4f4] px-3 py-1 rounded-full"
                  >
                    {label}
                  </span>
                )
              )}
              {availability?.immediate && (
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase bg-emerald-600 text-white px-3 py-1 rounded-full">
                  Ready to Move
                </span>
              )}
            </div>

            <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-5xl lg:text-6xl font-bold text-[#0B0B0C] mt-4 sm:mt-5 leading-tight tracking-tight break-words">
              {mainTitle}
              {italicTitle && (
                <span className="italic font-normal text-[#0B0B0C]/80">
                  {italicTitle}
                </span>
              )}
            </h1>

            <div className="flex items-start gap-1.5 text-[#0B0B0C]/60 text-[13px] sm:text-sm mt-3">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[#0B0B0C]/40" />
              <span>
                {property.building}, {property.locality}, Hiranandani Estate, Thane
              </span>
            </div>
          </div>

          {/* Right: Price Card — sticky on desktop, inline on mobile */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden">

              {/* Price */}
              <div className="px-5 sm:px-7 pt-6 pb-5">
                <p className="text-[9px] tracking-[0.25em] text-[#0B0B0C]/45 uppercase font-semibold mb-2">
                  {isRent ? "Price Per Month" : "Sale Price"}
                </p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-bold text-[#0B0B0C] font-[family-name:var(--font-playfair)]">
                    {formatPrice(property.price)}
                  </span>
                  {isRent && <span className="text-[#0B0B0C]/40 text-sm">/mo</span>}
                  {property.rentNegotiable && (
                    <span className="ml-1 text-[10px] font-semibold tracking-wide uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Negotiable
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="border-t border-gray-100 px-5 sm:px-7 py-4 space-y-2.5">
                {isRent && property.deposit != null && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#0B0B0C]/50">Security Deposit</span>
                    <span className="font-semibold text-[#0B0B0C]">{formatPrice(property.deposit)}</span>
                  </div>
                )}
                {isRent && property.lockInMonths != null && property.lockInMonths > 0 && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#0B0B0C]/50">Lock-in Period</span>
                    <span className="font-semibold text-[#0B0B0C]">
                      {property.lockInMonths} month{property.lockInMonths > 1 ? "s" : ""}
                      {property.lockInNegotiable ? " · negotiable" : ""}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#0B0B0C]/50">Available From</span>
                  {availability ? (
                    <span className={`font-semibold inline-flex items-center gap-1.5 ${availability.immediate ? "text-emerald-700" : "text-[#0B0B0C]"}`}>
                      {availability.immediate && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      {availability.label}
                    </span>
                  ) : (
                    <span className="text-[#0B0B0C]/40">Not specified</span>
                  )}
                </div>
              </div>

              {/* CTAs */}
              <div className="border-t border-gray-100 px-5 sm:px-7 py-5 bg-[#fafafa]">
                <InquiryButton
                  propertyId={property.id}
                  hasRegistered={hasRegistered}
                  isLoggedIn={!!session}
                  userName={session?.user?.name ?? ""}
                  userEmail={session?.user?.email ?? ""}
                  autoOpen={resolvedSearch?.showInterest === "1" && !!session && !hasRegistered}
                />
                <div className="mt-3">
                  <WhatsAppShareButton
                    property={{
                      id: property.id,
                      title: property.title,
                      type: property.type,
                      listingType: property.listingType,
                      building: property.building,
                      locality: property.locality,
                      bedrooms: property.bedrooms,
                      bathrooms: property.bathrooms,
                      areaSqft: property.areaSqft,
                      furnished: property.furnished,
                      price: property.price,
                      deposit: property.deposit,
                    }}
                  />
                </div>
                <p className="flex items-center justify-center gap-1.5 text-[10px] text-[#0B0B0C]/45 mt-4 tracking-wide">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  100% Verified Property · No hidden surprises
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Key Stats — dark band ── */}
        <div className="bg-[#111111] rounded-2xl p-3 mt-8 sm:mt-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              {
                icon: BedDouble,
                label: "Bedrooms",
                value: property.bedrooms ? `${property.bedrooms} BHK` : "—",
              },
              {
                icon: Bath,
                label: "Bathrooms",
                value: property.bathrooms ?? "—",
              },
              {
                icon: Maximize2,
                label: "Area",
                value: formatArea(property.areaSqft),
              },
              {
                icon: Building2,
                label: "Floor",
                value:
                  property.floor != null
                    ? `${property.floor}${property.totalFloors ? ` of ${property.totalFloors}` : ""}`
                    : "—",
              },
              {
                icon: CalendarClock,
                label: "Available From",
                value: availability?.label ?? "Not specified",
                accent: availability?.immediate ?? false,
              },
            ].map(({ icon: Icon, label, value, accent }) => (
              <div
                key={label}
                className="bg-[#1c1c1c] rounded-xl flex flex-col items-center text-center py-6 sm:py-7 px-3"
              >
                <Icon
                  className={`h-5 w-5 mb-3 ${accent ? "text-emerald-400" : "text-white/35"}`}
                  strokeWidth={1.5}
                />
                <p className={`font-bold text-lg sm:text-xl leading-tight tracking-tight ${accent ? "text-emerald-400" : "text-white"}`}>
                  {value}
                </p>
                <p className="text-[9px] tracking-[0.22em] text-white/40 mt-2 uppercase">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── About + Amenities ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 lg:gap-8 items-start mt-8 sm:mt-12">
          {/* Left 60%: About */}
          <div className="bg-[#fafafa] border border-gray-100 px-5 sm:px-8 pb-6 sm:pb-8 pt-5 sm:pt-6 rounded-2xl">
            <SectionLabel title="About This Property" compact />
            <p className="text-[#0B0B0C]/75 leading-[1.85] text-[14px] sm:text-[15px] whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Right 40%: Amenities */}
          {amenities.length > 0 && (
            <div className="bg-[#fafafa] border border-gray-100 px-5 sm:px-8 pb-6 sm:pb-8 pt-5 sm:pt-6 rounded-2xl">
              <SectionLabel title="Amenities" compact />
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => {
                  const Icon = getAmenityIcon(amenity);
                  return (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-2.5 pr-3.5 py-1.5"
                    >
                      <Icon className="h-3.5 w-3.5 text-[#0B0B0C]/50" strokeWidth={1.5} />
                      <span className="text-[12px] text-[#0B0B0C]/75 font-medium leading-none">
                        {amenity}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Location / Map ── */}
        {property.latitude && property.longitude && (
          <>
            <SectionLabel title="Location" withLine />
            <PropertyMapSection
              lat={property.latitude}
              lng={property.longitude}
              propertyId={property.id}
              isLoggedIn={!!session}
            />
          </>
        )}

        {/* ── Footer meta ── */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#0B0B0C]/40 mt-10 sm:mt-16 pt-6 pb-16 sm:pb-20 border-t border-gray-100">
          <span>Listed {formatDate(property.createdAt)}</span>
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1 font-medium text-[#0B0B0C]/55">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Verified Owner
          </span>
        </div>
      </div>
    </div>
  );
}
