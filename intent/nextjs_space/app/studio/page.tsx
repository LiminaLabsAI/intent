import { redirect } from 'next/navigation';

// Phase 10: one Studio. /studio is retired — the agent Studio lives at /refine.
export default function StudioPage() {
  redirect('/refine');
}
