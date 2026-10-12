// Moves "now" to the synthetic date 2026-10-12 (UTC) while letting time keep advancing.
const RealDate = Date
const offset = RealDate.parse('2026-10-12T12:00:00Z') - RealDate.now()
class SyntheticDate extends RealDate {
  constructor(...args: [] | [number | string | Date] | ConstructorParameters<typeof Date>) {
    if (args.length === 0) super(RealDate.now() + offset)
    else super(...(args as ConstructorParameters<typeof Date>))
  }
  static now() { return RealDate.now() + offset }
}
window.Date = SyntheticDate as DateConstructor
