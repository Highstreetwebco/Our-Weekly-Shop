export type Requirement = {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  portions: number;
  source: 'meal' | 'regular' | 'manual';
  exactProduct?: boolean;
  preferredProduct?: string;
};

export type Pack = { id: string; name: string; contains: number; unit: string; pricePence: number; retailer: string };
export type BasketLine = Requirement & { requiredQuantity: number; selectedPack?: Pack; packsToBuy?: number; estimatedPence?: number };

/** Combines identical needs before selecting pack sizes, so three meals needing
 * chicken do not produce three disconnected chicken entries. */
export function buildBasket(requirements: Requirement[], householdPortions: number): BasketLine[] {
  const combined = new Map<string, BasketLine>();
  for (const item of requirements) {
    const scale = householdPortions / item.portions;
    const requiredQuantity = item.quantity * scale;
    const key = `${item.ingredientId}:${item.unit}:${item.exactProduct ? item.preferredProduct ?? item.name : 'flexible'}`;
    const existing = combined.get(key);
    if (existing) existing.requiredQuantity += requiredQuantity;
    else combined.set(key, { ...item, requiredQuantity });
  }
  return [...combined.values()];
}

/** Picks the least-waste affordable pack configuration from an approved retailer catalogue. */
export function choosePack(line: BasketLine, availablePacks: Pack[]): BasketLine {
  const candidates = availablePacks.filter(pack => pack.unit === line.unit && (!line.exactProduct || pack.name === line.preferredProduct));
  if (!candidates.length) return line;
  const ranked = candidates.map(pack => {
    const packsToBuy = Math.ceil(line.requiredQuantity / pack.contains);
    return { pack, packsToBuy, estimatedPence: packsToBuy * pack.pricePence, waste: packsToBuy * pack.contains - line.requiredQuantity };
  }).sort((a,b) => a.estimatedPence - b.estimatedPence || a.waste - b.waste);
  const best = ranked[0];
  return { ...line, selectedPack: best.pack, packsToBuy: best.packsToBuy, estimatedPence: best.estimatedPence };
}

export function totalPence(lines: BasketLine[]) { return lines.reduce((sum, line) => sum + (line.estimatedPence ?? 0), 0); }
