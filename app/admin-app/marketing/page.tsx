import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import type { MarketingTask } from '@/types/database'

export default async function MarketingPage() {
  const db = createAdminClient()

  const { data: shows } = await db
    .from('shows')
    .select('id, title, date, status')
    .in('status', ['fullbooked', 'published'])
    .order('date', { ascending: true })

  const showIds = (shows ?? []).map(s => s.id)
  const { data: allTasks } = showIds.length
    ? await db.from('marketing_tasks').select('*').in('show_id', showIds)
    : { data: [] as MarketingTask[] }
  const tasksByShow = (allTasks ?? []).reduce<Record<string, MarketingTask[]>>((acc, t) => {
    if (!acc[t.show_id]) acc[t.show_id] = []
    acc[t.show_id]!.push(t)
    return acc
  }, {})

  return (
    <div>
      <AdminHeader title="Marketing" description="Alle aktive show" />
      <div className="p-6 space-y-6">
        {(shows ?? []).map((show) => {
          const tasks = tasksByShow[show.id] ?? []
          const done = tasks.filter(t => t.is_completed).length
          const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
          return (
            <div key={show.id} className="rounded-lg border p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-semibold">{show.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(show.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}
                    <span className={show.status === 'published' ? 'text-emerald-600' : 'text-purple-600'}>{show.status}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold">{pct}%</div>
                  <div className="text-xs text-muted-foreground">{done}/{tasks.length} oppgaver</div>
                </div>
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${task.is_completed ? 'bg-emerald-500' : 'border border-border'}`}>
                        {task.is_completed && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>{task.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ingen markedsoppgaver satt opp for dette showet.</p>
              )}
            </div>
          )
        })}
        {!shows?.length && (
          <p className="text-muted-foreground text-sm">Ingen aktive show.</p>
        )}
      </div>
    </div>
  )
}
