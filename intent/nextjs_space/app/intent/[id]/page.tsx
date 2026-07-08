import { IntentDetailClient } from './intent-detail-client';

export default function IntentDetailPage({ params }: { params: { id: string } }) {
  return <IntentDetailClient intentId={params?.id ?? ''} />;
}
