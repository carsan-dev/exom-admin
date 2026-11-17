// Galería solo de evidencia (F2): monta las piezas nuevas del sistema de diseño con la hoja de estilos real
// (fixture.css importa src/index.css) para compararlas con docs/redesign/sistema.html.
// Query: ?theme=dark|light (clase en <html>), ?open=side|workbench (abre el panel o el banco de trabajo).
// No se importa desde la app ni se enlaza desde ella; solo el servidor del arnés la sirve en /gallery.html.
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './fixture.css'
import { StatusChip } from '../../../../src/components/ui/status-chip'
import { Tag } from '../../../../src/components/ui/tag'
import { Textarea } from '../../../../src/components/ui/textarea'
import { Checkbox } from '../../../../src/components/ui/checkbox'
import { Switch } from '../../../../src/components/ui/switch'
import { SegmentedControl } from '../../../../src/components/ui/segmented'
import { Button } from '../../../../src/components/ui/button'
import { PageHeader } from '../../../../src/components/page/page-header'
import { Pagination } from '../../../../src/components/page/pagination'
import { EmptyState } from '../../../../src/components/page/empty-state'
import { ErrorState } from '../../../../src/components/page/error-state'
import { FigureStrip } from '../../../../src/components/page/figure-strip'
import { SelectionBar } from '../../../../src/components/workspace/selection-bar'
import { SidePanel } from '../../../../src/components/workspace/side-panel'
import { Workbench } from '../../../../src/components/workspace/workbench'
import { Inbox, Plus } from 'lucide-react'

const query = new URLSearchParams(window.location.search)
const theme = query.get('theme') === 'light' ? 'light' : 'dark'
document.documentElement.classList.remove('dark', 'light')
document.documentElement.classList.add(theme)
const openPiece = query.get('open')

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function Gallery() {
  const [seg, setSeg] = useState('semana')
  const [page, setPage] = useState(3)
  const [side, setSide] = useState(openPiece === 'side')
  const [bench, setBench] = useState(openPiece === 'workbench')
  const [text, setText] = useState('Nota de seguimiento de ejemplo')
  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-[1100px]">
        <Section id="chips" title="StatusChip y Tag">
          <div className="flex flex-wrap gap-3">
            <StatusChip variant="success">Activo</StatusChip>
            <StatusChip variant="warning">Pendiente</StatusChip>
            <StatusChip variant="danger">Fallido</StatusChip>
            <StatusChip variant="info">En curso</StatusChip>
            <StatusChip variant="neutral">Archivado</StatusChip>
            <StatusChip variant="brand">Destacado</StatusChip>
          </div>
          <div className="flex flex-wrap gap-3">
            <Tag>Fuerza</Tag>
            <Tag color="#baf23a">Hipertrofia</Tag>
            <Tag color="#ff6b57">Alta intensidad</Tag>
          </div>
        </Section>
        <Section id="fields" title="Textarea, Checkbox, Switch, SegmentedControl">
          <div className="max-w-md">
            <Textarea showCount maxLength={200} value={text} onChange={(e) => setText(e.target.value)} aria-label="Nota" />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm"><Checkbox aria-label="Sin marcar" />Sin marcar</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked aria-label="Marcado" />Marcado</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked="indeterminate" aria-label="Indeterminado" onCheckedChange={() => {}} />Indeterminado</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox disabled aria-label="Deshabilitado" />Deshabilitado</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox disabled defaultChecked aria-label="Deshabilitado marcado" />Deshabilitado marcado</label>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch aria-label="Apagado" />Apagado</label>
            <label className="flex items-center gap-2 text-sm"><Switch defaultChecked aria-label="Encendido" />Encendido</label>
            <label className="flex items-center gap-2 text-sm"><Switch disabled aria-label="Deshabilitado" />Deshabilitado</label>
            <label className="flex items-center gap-2 text-sm"><Switch disabled defaultChecked aria-label="Deshabilitado encendido" />Deshabilitado encendido</label>
          </div>
          <SegmentedControl aria-label="Vista" value={seg} onValueChange={setSeg} options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }, { value: 'lista', label: 'Lista' }]} />
        </Section>
        <Section id="page" title="PageHeader, FigureStrip, Pagination">
          <PageHeader eyebrow="Clientes" title="Seguimiento" description="Resumen del estado de tus clientes esta semana." actions={<><Button variant="outline">Exportar</Button><Button><Plus aria-hidden="true" />Nuevo cliente</Button></>} />
          <FigureStrip aria-label="Cifras" items={[
            { label: 'Activos', value: '42', hint: '+3 esta semana', tone: 'success' },
            { label: 'Pendientes', value: '7', hint: 'Revisar hoy', tone: 'warning' },
            { label: 'Incidencias', value: '2', hint: 'Sin respuesta', tone: 'danger' },
            { label: 'Total', value: '51' },
          ]} />
          <Pagination page={page} totalPages={8} onPageChange={setPage} summary="Mostrando 21-30 de 76 resultados" />
        </Section>
        <Section id="states" title="EmptyState y ErrorState">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border-strong"><EmptyState icon={<Inbox />} title="Todavía no hay recaps" description="Cuando generes un recap aparecerá aquí." action={<Button variant="outline">Crear recap</Button>} /></div>
            <div className="border border-border-strong"><ErrorState description="Comprueba tu conexión e inténtalo de nuevo." onRetry={() => {}} /></div>
          </div>
        </Section>
        <Section id="selection" title="SelectionBar">
          <SelectionBar count={3} onClear={() => {}}>
            <Button variant="outline" size="sm">Archivar</Button>
            <Button variant="destructive" size="sm">Eliminar</Button>
          </SelectionBar>
        </Section>
        <Section id="overlays" title="SidePanel y Workbench">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSide(true)}>Abrir panel</Button>
            <Button variant="outline" onClick={() => setBench(true)}>Abrir banco de trabajo</Button>
          </div>
        </Section>
      </div>
      <SidePanel open={side} onOpenChange={setSide} title="Detalle del cliente" description="Información y notas del cliente." footer={<><Button variant="outline" onClick={() => setSide(false)}>Cancelar</Button><Button>Guardar</Button></>}>
        <div className="space-y-4 p-6 text-sm">
          <p>Contenido del panel lateral con texto de ejemplo para ver espaciado y tipografía.</p>
          <Textarea aria-label="Notas" defaultValue="Notas del coach" showCount maxLength={200} />
        </div>
      </SidePanel>
      <Workbench open={bench} onOpenChange={setBench} title="Editor de entrenamiento" description="Superficie de trabajo a pantalla completa." headerActions={<><Button variant="outline" onClick={() => setBench(false)}>Cancelar</Button><Button>Guardar</Button></>} footer={<span className="text-sm text-foreground-secondary">3 bloques · 12 ejercicios</span>}>
        <div className="space-y-4 p-6 text-sm">
          <p>Área de trabajo desplazable con contenido de ejemplo.</p>
          <FigureStrip items={[{ label: 'Bloques', value: '3' }, { label: 'Ejercicios', value: '12' }]} />
        </div>
      </Workbench>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Gallery /></React.StrictMode>)
