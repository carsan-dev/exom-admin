import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import type { RecapPrintModel } from './recap-print-model'

const printStyles = `
  #recap-print-report { display: none; }
  @media print {
    @page { size: A4; margin: 16mm; }
    html, body { height: auto !important; overflow: visible !important; background: white !important; }
    body > :not(#recap-print-report) { display: none !important; }
    #recap-print-report { display: block !important; color: black; background: white;
      font: 11pt/1.5 Arial, sans-serif; width: auto; height: auto; overflow: visible; }
    #recap-print-report * { box-sizing: border-box; color: black; min-width: 0; max-width: 100%; }
    #recap-print-report h1 { font-size: 20pt; }
    #recap-print-report h2 { font-size: 14pt; margin-top: 1.2em; }
    #recap-print-report h1, #recap-print-report h2, #recap-print-report dt { break-after: avoid; }
    #recap-print-report dt { font-weight: bold; margin-top: .7em; }
    #recap-print-report dd { margin: 0 0 .7em; }
    #recap-print-report p, #recap-print-report dd, #recap-print-report h1,
    #recap-print-report h2, #recap-print-report dt { white-space: pre-wrap; overflow-wrap: anywhere; }
    /* Preserve paragraphs/spaces without pre-wrap's hanging trailing spaces. */
    #recap-print-report section p, #recap-print-report dd { white-space: break-spaces; }
    #recap-print-report p, #recap-print-report dd { orphans: 3; widows: 3; }
  }
`

export function RecapPrintableSummary({ model, disabled = false }: {
  model: RecapPrintModel | null
  disabled?: boolean
}) {
  if (!model) return null

  return <>
    <Button variant="outline" disabled={disabled} onClick={() => window.print()}>Imprimir / Guardar PDF</Button>
    {createPortal(
      <article id="recap-print-report" aria-label="Resumen imprimible del recap">
        <style>{printStyles}</style>
        <h1>Resumen de recap</h1>
        <p>{model.clientName}</p>
        <p>Semana {model.week}</p>
        <p>Enviado: {model.submittedDate}</p>
        {model.sections.map((section) => <section key={section.title}>
          <h2>{section.title}</h2>
          <dl>{section.answers.map((item) => <div key={item.label}>
            <dt>{item.label}</dt><dd>{item.value}</dd>
          </div>)}</dl>
        </section>)}
        {model.publishedReview.map((item) => <section key={item.label}>
          <h2>{item.label}</h2><p>{item.value}</p>
        </section>)}
        {model.feedback && <section>
          <h2>Revisión compartible</h2>
          <p>{model.feedback}</p>
        </section>}
      </article>, document.body,
    )}
  </>
}
