/**
 * Daily cost in NPR treated as "average" by the budget estimator. A
 * destination's `costPerDay` is divided by this to get the accommodation/food
 * scale factor (clamped to 0.8–1.9), so a destination priced at 4800/day
 * estimates at exactly 1.0. Changing it shifts every estimate.
 */
export const PRICING_BASELINE_COST_PER_DAY = 4800
