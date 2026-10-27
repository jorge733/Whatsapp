import Nav from '@/components/Nav';
import { requireAdmin } from '@/lib/auth';

export default async function PanelLayout({ children }) {
  const { supabase } = await requireAdmin();
  const [{ count }, { data: settings }] = await Promise.all([
    supabase.from('review_cases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('settings').select('test_mode').eq('id', 1).single(),
  ]);
  return (
    <div className="lg:pl-60">
      <Nav pendingCases={count ?? 0} testMode={settings?.test_mode} />
      <main
        className="mx-auto max-w-3xl px-4 pt-6 pb-28 lg:px-8 lg:pt-10 lg:pb-12"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        {children}
      </main>
    </div>
  );
}
