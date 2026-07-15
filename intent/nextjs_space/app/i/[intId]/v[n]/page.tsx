import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getVersion, getBundle, autogenLogMd } from '@/lib/agent';
import type { BundleVersionView } from '@/lib/agent';
import { parseOkf } from '@/lib/agent/okf';
import ReactMarkdown from 'react-markdown';

export const dynamic = 'force-dynamic';

export default async function PublishedVersionPage({
  params,
}: {
  params: { intId: string; n: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/i/${params.intId}/v${params.n}`);

  const intId = params.intId;
  const versionNo = parseInt(params.n, 10);

  // Resolve the intent (match by intentId human-readable id like INT-XXXXX or the cuid)
  const intent = await prisma.intent.findFirst({
    where: {
      OR: [{ intentId: intId }, { id: intId }],
    },
    select: { id: true, requesterId: true, rawInput: true, expectedOutcome: true },
  });
  if (!intent) return <div className="p-8 text-gray-500">Intent not found.</div>;

  // RBAC: END_USER only their own
  const user = session.user as { id: string; role: string };
  if (user.role === 'END_USER' && intent.requesterId !== user.id) {
    return <div className="p-8 text-gray-500">You do not have access to this artifact.</div>;
  }

  const bundle = await getBundle(intent.id);
  if (!bundle) return <div className="p-8 text-gray-500">No published artifacts.</div>;

  // Find the requested version
  const version = bundle.published.find((v) => v.versionNo === versionNo && v.state !== 'ARCHIVED');
  if (!version) return <div className="p-8 text-gray-500">Version v{versionNo} not found or archived.</div>;

  const logMd = await autogenLogMd(intent.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {intent.expectedOutcome || intent.rawInput.slice(0, 60)}
            </h1>
            <p className="text-sm text-gray-500">
              {intId} · v{version.versionNo} · {version.state === 'SUPERSEDED' ? 'superseded' : version.state === 'DEPRECATED' ? 'deprecated' : 'published'}
              {version.personaLabel ? ` · ${version.personaLabel}` : ''}
            </p>
          </div>
          <span className="text-xs text-gray-400">Published {new Date(version.publishedAt ?? version.builtAt).toLocaleDateString()}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {version.concepts.map((cf) => {
          const full = `---\n${Object.entries(cf.frontmatter).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${cf.body}`;
          const parsed = parseOkf(full);
          return (
            <article key={cf.path} className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">{cf.path}</h2>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">{cf.okfType}</span>
              </div>
              {Object.keys(parsed.data).length > 0 && (
                <dl className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {Object.entries(parsed.data).map(([k, v]) => (
                    <div key={k}><dt className="inline font-medium">{k}:</dt> <dd className="inline">{v}</dd></div>
                  ))}
                </dl>
              )}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{parsed.body}</ReactMarkdown>
              </div>
            </article>
          );
        })}
        <article className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">log.md</h2>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{logMd}</ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
}