export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/([aeiou])([\u0300-\u036f]+)/g, '$1')
    .normalize('NFC')
}
