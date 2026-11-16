import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CatalogTabsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  catalogTitle: string
}

export function CatalogTabsToolbar({ search, onSearchChange, catalogTitle }: CatalogTabsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto xl:w-auto xl:overflow-visible">
        <TabsTrigger value="muscle-groups" className="min-h-11 shrink-0 md:min-h-10">
          Grupos musculares
        </TabsTrigger>
        <TabsTrigger value="equipment" className="min-h-11 shrink-0 md:min-h-10">
          Equipamiento
        </TabsTrigger>
        <TabsTrigger value="training-types" className="min-h-11 shrink-0 md:min-h-10">
          Tipos entrenos
        </TabsTrigger>
        <TabsTrigger value="training-tags" className="min-h-11 shrink-0 md:min-h-10">
          Tags entrenos
        </TabsTrigger>
        <TabsTrigger value="diet-badges" className="min-h-11 shrink-0 md:min-h-10">
          Badges dieta
        </TabsTrigger>
        <TabsTrigger value="diet-tags" className="min-h-11 shrink-0 md:min-h-10">
          Tags dieta
        </TabsTrigger>
      </TabsList>

      <div className="relative w-full xl:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Buscar en ${catalogTitle.toLocaleLowerCase()}...`}
          className="h-11 pl-9 md:h-10"
        />
      </div>
    </div>
  )
}
