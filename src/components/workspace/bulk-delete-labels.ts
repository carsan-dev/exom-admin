/** Spanish nouns for the entity being deleted, e.g. dieta/dietas (feminine). */
export interface BulkDeleteEntityLabels {
  singular: string
  plural: string
  gender: 'feminine' | 'masculine'
}

/** «1 dieta» / «3 dietas». */
export function formatEntityCount(count: number, labels: BulkDeleteEntityLabels) {
  return `${count} ${count === 1 ? labels.singular : labels.plural}`
}

/** Participle agreeing in gender and number: («eliminad», 2, feminine) → «eliminadas». */
export function agreeParticiple(stem: string, count: number, gender: BulkDeleteEntityLabels['gender']) {
  return `${stem}${gender === 'feminine' ? 'a' : 'o'}${count === 1 ? '' : 's'}`
}
