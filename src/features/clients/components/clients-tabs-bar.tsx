import { TabsList, TabsTrigger } from '@/components/ui/tabs'

const TAB_TRIGGER_CLASS =
  'rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-accent-text'

export function ClientsTabsBar() {
  return (
    <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
      <TabsTrigger value="clients" className={TAB_TRIGGER_CLASS}>
        Clientes
      </TabsTrigger>
      <TabsTrigger value="admins" className={TAB_TRIGGER_CLASS}>
        Admins
      </TabsTrigger>
      <TabsTrigger value="super-admins" className={TAB_TRIGGER_CLASS}>
        Super Admins
      </TabsTrigger>
    </TabsList>
  )
}
