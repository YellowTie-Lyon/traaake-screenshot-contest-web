import type { EnvironmentName } from '@/lib/supabase/types'

export function EnvironmentBadge({ env }: { env: EnvironmentName }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
      env === 'production'
        ? 'bg-red-900/20 border-red-700/40 text-red-400'
        : 'bg-amber-900/20 border-amber-700/40 text-amber-400'
    }`}>
      {env === 'production' ? 'Production' : 'Test'}
    </span>
  )
}
