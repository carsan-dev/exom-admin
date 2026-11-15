import { TabsList, TabsTrigger } from '@/components/ui/tabs'

const TAB_TRIGGER_CLASS = 'min-h-11 shrink-0 md:min-h-10'

export function ClientsTabsBar() {
  return (
    <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto">
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
