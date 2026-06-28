import { AlertTriangle } from 'lucide-react'

export function SupabaseBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-amber-700/40 bg-amber-900/10 text-amber-400">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold">Supabase non configuré</p>
        <p className="text-xs text-amber-500/80 mt-0.5">
          Ajoutez <code className="bg-amber-900/30 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> et <code className="bg-amber-900/30 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans vos variables d&apos;environnement Netlify. Les données affichées sont mockées.
        </p>
      </div>
    </div>
  )
}
