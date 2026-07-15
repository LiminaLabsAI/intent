import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getBundle } from '@/lib/agent';

export const dynamic = 'force-dynamic';

export default async function IntentIndexPage({
  params,
}: {
  params: { intId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/i/${params.intId}`);

  const intent = await prisma.intent.findFirst({
    where: { OR: [{ intentId: params.intId }, { id: params.intId }] },
    select: { id: true, requesterId: true },
  });
  if (!intent) return <div className="p-8 text-gray-500">Intent not found.</div>;

  const user = session.user as { id: string; role: string };
  if (user.role === 'END_USER' && intent.requesterId !== user.id) {
    return <div className="p-8 text-gray-500">You do not have access to this artifact.</div>;
  }

  const bundle = await getBundle(intent.id);
  if (!bundle || !bundle.latestPublishedVersionId) {
    return <div className="p-8 text-gray-500">No published artifacts yet.</div>;
  }

  const latest = bundle.published.find((v) => v.id === bundle.latestPublishedVersionId);
  if (!latest || latest.versionNo == null) {
    return <div className="p-8 text-gray-500">No published artifacts yet.</div>;
  }

  redirect(`/i/${params.intId}/v${latest.versionNo}`);
}