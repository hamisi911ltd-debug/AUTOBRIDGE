import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/app/admin/users/UserForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, user] = await Promise.all([auth(), prisma.user.findUnique({ where: { id } })]);
  if (!user) notFound();

  return (
    <UserForm
      initial={{
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isYou: user.id === session?.user?.id,
      }}
    />
  );
}
