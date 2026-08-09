"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runScrape, type ScrapeSummary } from "@/lib/scrapers/runScrape";
import type { MarkupType, Role, ScopeType } from "@/generated/prisma/enums";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Not authorized");
  return session;
}

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function savePricingRule(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string | null;
  const scopeType = formData.get("scopeType") as ScopeType;
  const markupType = formData.get("markupType") as MarkupType;
  const scopeValueRaw = (formData.get("scopeValue") as string | null)?.trim();

  const data = {
    name: (formData.get("name") as string) || "Untitled rule",
    scopeType,
    scopeValue: ["COUNTRY", "EXPORTER", "BODY_TYPE", "MAKE", "MODEL"].includes(scopeType)
      ? scopeValueRaw || null
      : null,
    markupType,
    // The form collects PERCENT as a whole number (e.g. "8" for 8%) —
    // convert to the fraction the pricing engine expects. FIXED is a raw
    // USD amount, so it passes through unchanged.
    value:
      markupType === "TIERED"
        ? null
        : markupType === "PERCENT"
          ? (num(formData, "value") ?? 0) / 100
          : num(formData, "value"),
    tiers: markupType === "TIERED" ? (formData.get("tiers") as string) : null,
    priceMinUsd: scopeType === "PRICE_BAND" ? num(formData, "priceMinUsd") : null,
    priceMaxUsd: scopeType === "PRICE_BAND" ? num(formData, "priceMaxUsd") : null,
    minProfitUsd: num(formData, "minProfitUsd"),
    maxProfitUsd: num(formData, "maxProfitUsd"),
    priority: num(formData, "priority") ?? 0,
    active: formData.get("active") === "on",
  };

  if (id) {
    await prisma.pricingRule.update({ where: { id }, data });
  } else {
    await prisma.pricingRule.create({ data });
  }

  revalidatePath("/admin/pricing");
  revalidatePath("/");
}

export async function deletePricingRule(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.pricingRule.delete({ where: { id } });
  revalidatePath("/admin/pricing");
  revalidatePath("/");
}

export async function toggleRuleActive(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const rule = await prisma.pricingRule.findUniqueOrThrow({ where: { id } });
  await prisma.pricingRule.update({ where: { id }, data: { active: !rule.active } });
  revalidatePath("/admin/pricing");
  revalidatePath("/");
}

export async function saveVehicle(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string | null;
  const lifestyle = ((formData.get("lifestyle") as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const eligible = formData.get("eligible") === "on";

  const data = {
    make: formData.get("make") as string,
    model: formData.get("model") as string,
    trim: formData.get("trim") as string,
    year: num(formData, "year") ?? 2020,
    mileageKm: num(formData, "mileageKm") ?? 0,
    fuel: formData.get("fuel") as string,
    transmission: formData.get("transmission") as string,
    engineCc: num(formData, "engineCc") ?? 0,
    bodyType: formData.get("bodyType") as string,
    drive: formData.get("drive") as string,
    seats: num(formData, "seats") ?? 5,
    color: formData.get("color") as string,
    sourceCountry: formData.get("sourceCountry") as string,
    sourcePriceUsd: num(formData, "sourcePriceUsd") ?? 0,
    imageUrl: (formData.get("imageUrl") as string)?.trim() || null,
    condition: (formData.get("condition") as string) || "Foreign Used",
    badge: (formData.get("badge") as string) || null,
    lifestyle: JSON.stringify(lifestyle),
    eligible,
    ineligibleReason: eligible ? null : (formData.get("ineligibleReason") as string) || null,
  };

  let vehicleId = id;
  if (id) {
    await prisma.vehicle.update({ where: { id }, data });
  } else {
    const created = await prisma.vehicle.create({ data });
    vehicleId = created.id;
  }

  revalidatePath("/admin/vehicles");
  revalidatePath("/");
  redirect(`/admin/vehicles/${vehicleId}/edit`);
}

export async function deleteVehicle(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.enquiry.deleteMany({ where: { vehicleId: id } });
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/admin/vehicles");
  revalidatePath("/");
  redirect("/admin/vehicles");
}

/**
 * Manual "run it now" trigger for the same nightly scrape the cron route
 * runs — lets the admin refresh inventory on demand instead of waiting for
 * the schedule. Runs synchronously; the button that calls this should say
 * it can take a minute or two.
 */
export async function runScrapeNow(): Promise<ScrapeSummary> {
  await requireAdmin();
  const summary = await runScrape(1);
  revalidatePath("/admin");
  revalidatePath("/admin/vehicles");
  revalidatePath("/");
  return summary;
}

export async function toggleEnquiryHandled(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const enquiry = await prisma.enquiry.findUniqueOrThrow({ where: { id } });
  await prisma.enquiry.update({ where: { id }, data: { handled: !enquiry.handled } });
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

export async function deleteEnquiry(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.enquiry.delete({ where: { id } });
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

export async function saveUser(formData: FormData) {
  const session = await requireAdmin();

  const id = formData.get("id") as string | null;
  const email = (formData.get("email") as string).trim().toLowerCase();
  const name = (formData.get("name") as string).trim();
  const role = formData.get("role") as Role;
  const password = (formData.get("password") as string) || "";

  if (!id && !password) throw new Error("Password is required for a new user");

  const data: { email: string; name: string; role: Role; passwordHash?: string } = { email, name, role };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  if (id) {
    if (id === session?.user?.id && role !== "ADMIN") {
      throw new Error("You can't remove your own admin role");
    }
    await prisma.user.update({ where: { id }, data });
  } else {
    await prisma.user.create({ data: data as { email: string; name: string; role: Role; passwordHash: string } });
  }

  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();
  const id = formData.get("id") as string;

  if (id === session?.user?.id) throw new Error("You can't delete your own account");

  const target = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", id: { not: id } } });
    if (otherAdmins === 0) throw new Error("Can't delete the last admin account");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}
