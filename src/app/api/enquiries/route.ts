import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const body = await req.json();
  const { vehicleId, name, phone, email, message } = body ?? {};

  if (typeof vehicleId !== "string" || typeof name !== "string" || typeof phone !== "string") {
    return NextResponse.json({ error: "vehicleId, name and phone are required" }, { status: 400 });
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      vehicleId,
      name,
      phone,
      email: typeof email === "string" ? email : null,
      message: typeof message === "string" ? message : null,
    },
  });

  return NextResponse.json({ id: enquiry.id }, { status: 201 });
}
