export type AllocationInput = {
  company_id: string;
  name: string;
  ticker: string | null;
  composite_score: number;
  confidence_score: number;
  current_price: number | null;
};

export type AllocationOutput = {
  company_id: string;
  name: string;
  ticker: string | null;
  allocation_pct: number;
  dollar_amount: number;
  shares: number | null;
  current_price: number | null;
  price_needed: boolean;
};

export function computeModelAllocations(
  companies: AllocationInput[],
  capitalAmount: number
): AllocationOutput[] {
  if (companies.length === 0 || capitalAmount <= 0) return [];

  const weighted = companies.map((c) => ({
    ...c,
    raw_weight: c.composite_score * c.confidence_score,
  }));

  const totalWeight = weighted.reduce((sum, c) => sum + c.raw_weight, 0);
  if (totalWeight === 0) return [];

  return weighted.map((c) => {
    const allocation_pct = c.raw_weight / totalWeight;
    const dollar_amount = allocation_pct * capitalAmount;
    const price_needed = c.current_price === null || c.current_price <= 0;
    const shares = price_needed ? null : Math.floor(dollar_amount / c.current_price!);

    return {
      company_id: c.company_id,
      name: c.name,
      ticker: c.ticker,
      allocation_pct,
      dollar_amount,
      shares,
      current_price: c.current_price,
      price_needed,
    };
  });
}
