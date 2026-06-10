import { redirect } from "next/navigation";

export default async function ApprovalRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/requests/${id}`);
}
