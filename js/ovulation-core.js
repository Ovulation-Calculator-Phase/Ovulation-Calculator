const MIN_CYCLE = 21;
const MAX_CYCLE = 45;

function localDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
export function validateInput({ lmp, cycleLength, lutealPhase }) {
  const errors = [], warnings = [], date = localDate(lmp), today = new Date(); today.setHours(0, 0, 0, 0);
  if (!date) errors.push('Enter a valid last-period date.');
  else if (date > today) errors.push('The last-period date cannot be in the future.');
  if (!Number.isInteger(cycleLength) || cycleLength < MIN_CYCLE || cycleLength > MAX_CYCLE) errors.push(`Cycle length must be ${MIN_CYCLE}–${MAX_CYCLE} days.`);
  if (!Number.isInteger(lutealPhase) || lutealPhase < 10 || lutealPhase > 16) errors.push('Luteal phase must be 10–16 days.');
  if (cycleLength > 35) warnings.push('Cycles longer than 35 days are outside the common adult range. Estimates may be less reliable; consider discussing your cycle with a clinician.');
  return { valid: errors.length === 0, errors, warnings };
}
export function calculateCycles({ lmp, cycleLength, lutealPhase, count = 7 }) {
  const start = localDate(lmp);
  return Array.from({ length: count }, (_, index) => {
    const period = addDays(start, index * cycleLength);
    const nextPeriod = addDays(period, cycleLength);
    const ovulation = addDays(nextPeriod, -lutealPhase);
    return { index, lmp: period, nextPeriod, ovulation, fertileStart: addDays(ovulation, -5), fertileEnd: addDays(ovulation, 1), dueDate: addDays(period, 280) };
  });
}
