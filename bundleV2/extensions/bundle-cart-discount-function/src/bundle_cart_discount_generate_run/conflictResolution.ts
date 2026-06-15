import { CartInput } from "../../generated/api";
import type { ProductDiscountCandidate } from "../../generated/api";
import { log } from "./log";
import { parseMoneyAmount } from "./parsing";

export const MAX_EXACT_CONFLICT_WINNERS = 10;

function getCandidateTargetQuantities(
  candidate: ProductDiscountCandidate,
): Map<string, number> {
  const quantitiesByLineId = new Map<string, number>();
  for (const target of candidate.targets ?? []) {
    const cartLineId = String(target.cartLine?.id || "").trim();
    if (!cartLineId) continue;
    const quantity = Math.max(1, Math.trunc(Number(target.cartLine?.quantity) || 1));
    quantitiesByLineId.set(
      cartLineId,
      (quantitiesByLineId.get(cartLineId) || 0) + quantity,
    );
  }
  return quantitiesByLineId;
}

export function getCandidateTargetCartLineIds(
  candidate: ProductDiscountCandidate,
): string[] {
  return Array.from(getCandidateTargetQuantities(candidate).keys());
}

export function parseCandidatePercentValue(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function estimateCandidateSavings(
  candidate: ProductDiscountCandidate,
  unitPriceByLineId: Map<string, number>,
): number {
  const targetQuantitiesByLineId = getCandidateTargetQuantities(candidate);
  if (!targetQuantitiesByLineId.size) return 0;

  if ("fixedAmount" in candidate.value) {
    const fixedAmount = Number(candidate.value.fixedAmount?.amount || 0);
    const normalizedFixedAmount = Number.isFinite(fixedAmount) ? Math.max(0, fixedAmount) : 0;
    if (!candidate.value.fixedAmount?.appliesToEachItem) {
      return normalizedFixedAmount;
    }

    return Array.from(targetQuantitiesByLineId.values()).reduce((sum, quantity) => {
      return sum + normalizedFixedAmount * quantity;
    }, 0);
  }

  return Array.from(targetQuantitiesByLineId.entries()).reduce((sum, [lineId, quantity]) => {
    const unitPrice = Math.max(0, unitPriceByLineId.get(lineId) || 0);

    if ("percentage" in candidate.value) {
      const percent = Math.max(
        0,
        Math.min(100, parseCandidatePercentValue(candidate.value.percentage?.value)),
      );
      return sum + unitPrice * quantity * (percent / 100);
    }
    return sum;
  }, 0);
}

function getCandidateQuantityOverCapacityByLineId(
  candidateTargetQuantities: Map<string, number>,
  winners: Array<{
    targetQuantitiesByLineId: Map<string, number>;
  }>,
  lineCapacityByLineId: Map<string, number>,
): Map<string, number> {
  const overCapacityByLineId = new Map<string, number>();

  for (const [lineId, candidateQuantity] of candidateTargetQuantities.entries()) {
    const lineCapacity = Math.max(0, lineCapacityByLineId.get(lineId) || 0);
    const occupiedQuantity = winners.reduce(
      (sum, winner) => sum + (winner.targetQuantitiesByLineId.get(lineId) || 0),
      0,
    );
    const overCapacity = Math.max(0, occupiedQuantity + candidateQuantity - lineCapacity);
    if (overCapacity > 0) {
      overCapacityByLineId.set(lineId, overCapacity);
    }
  }

  return overCapacityByLineId;
}

function chooseProductWinnerIndicesToReplaceGreedy(
  remainingOverCapacityByLineId: Map<string, number>,
  winnerIndicesTouchingOverCapacity: number[],
  winners: Array<{
    targetQuantitiesByLineId: Map<string, number>;
    savings: number;
  }>,
): number[] {
  const selectedWinnerIndices = new Set<number>();
  while (Array.from(remainingOverCapacityByLineId.values()).some((quantity) => quantity > 0)) {
    let bestChoice:
      | {
          winnerIndex: number;
          usefulFreedQuantity: number;
          savings: number;
        }
      | null = null;

    for (const winnerIndex of winnerIndicesTouchingOverCapacity) {
      if (selectedWinnerIndices.has(winnerIndex)) continue;
      const winner = winners[winnerIndex];
      let usefulFreedQuantity = 0;

      for (const [lineId, overCapacity] of remainingOverCapacityByLineId.entries()) {
        if (overCapacity <= 0) continue;
        usefulFreedQuantity += Math.min(
          overCapacity,
          winner.targetQuantitiesByLineId.get(lineId) || 0,
        );
      }

      if (usefulFreedQuantity <= 0) continue;

      if (
        !bestChoice ||
        winner.savings / usefulFreedQuantity < bestChoice.savings / bestChoice.usefulFreedQuantity ||
        (winner.savings / usefulFreedQuantity === bestChoice.savings / bestChoice.usefulFreedQuantity &&
          winner.savings < bestChoice.savings)
      ) {
        bestChoice = {
          winnerIndex,
          usefulFreedQuantity,
          savings: winner.savings,
        };
      }
    }

    if (!bestChoice) {
      return winnerIndicesTouchingOverCapacity;
    }

    selectedWinnerIndices.add(bestChoice.winnerIndex);
    const selectedWinner = winners[bestChoice.winnerIndex];
    for (const [lineId, overCapacity] of remainingOverCapacityByLineId.entries()) {
      if (overCapacity <= 0) continue;
      const freedQuantity = selectedWinner.targetQuantitiesByLineId.get(lineId) || 0;
      remainingOverCapacityByLineId.set(
        lineId,
        Math.max(0, overCapacity - freedQuantity),
      );
    }
  }

  return Array.from(selectedWinnerIndices);
}

function chooseProductWinnerIndicesToReplace(
  candidateTargetQuantities: Map<string, number>,
  winners: Array<{
    targetQuantitiesByLineId: Map<string, number>;
    savings: number;
  }>,
  lineCapacityByLineId: Map<string, number>,
): number[] {
  const remainingOverCapacityByLineId = getCandidateQuantityOverCapacityByLineId(
    candidateTargetQuantities,
    winners,
    lineCapacityByLineId,
  );
  if (!remainingOverCapacityByLineId.size) {
    return [];
  }

  const winnerIndicesTouchingOverCapacity = winners.reduce<number[]>(
    (matched, winner, winnerIndex) => {
      const touchesOverCapacityLine = Array.from(remainingOverCapacityByLineId.keys()).some(
        (lineId) => (winner.targetQuantitiesByLineId.get(lineId) || 0) > 0,
      );
      if (touchesOverCapacityLine) {
        matched.push(winnerIndex);
      }
      return matched;
    },
    [],
  );

  if (winnerIndicesTouchingOverCapacity.length > MAX_EXACT_CONFLICT_WINNERS) {
    return chooseProductWinnerIndicesToReplaceGreedy(
      remainingOverCapacityByLineId,
      winnerIndicesTouchingOverCapacity,
      winners,
    );
  }

  const baseOccupiedByLineId = new Map<string, number>();
  for (const lineId of candidateTargetQuantities.keys()) {
    baseOccupiedByLineId.set(
      lineId,
      winners.reduce(
        (sum, winner) => sum + (winner.targetQuantitiesByLineId.get(lineId) || 0),
        0,
      ),
    );
  }

  let bestSubset: number[] | null = null;
  let bestSubsetSavings = Number.POSITIVE_INFINITY;
  let bestSubsetCount = Number.POSITIVE_INFINITY;
  const subsetCount = 1 << winnerIndicesTouchingOverCapacity.length;

  for (let mask = 1; mask < subsetCount; mask += 1) {
    const freedByLineId = new Map<string, number>();
    let removedSavings = 0;
    const removedWinnerIndices: number[] = [];
    let shouldSkipSubset = false;

    for (let bit = 0; bit < winnerIndicesTouchingOverCapacity.length; bit += 1) {
      if ((mask & (1 << bit)) === 0) continue;
      const winnerIndex = winnerIndicesTouchingOverCapacity[bit];
      const winner = winners[winnerIndex];
      removedWinnerIndices.push(winnerIndex);
      removedSavings += winner.savings;
      if (
        removedSavings > bestSubsetSavings ||
        (removedSavings === bestSubsetSavings &&
          removedWinnerIndices.length >= bestSubsetCount)
      ) {
        shouldSkipSubset = true;
        break;
      }
      for (const [lineId, quantity] of winner.targetQuantitiesByLineId.entries()) {
        freedByLineId.set(lineId, (freedByLineId.get(lineId) || 0) + quantity);
      }
    }

    if (shouldSkipSubset) continue;

    const fitsAfterRemoval = Array.from(candidateTargetQuantities.entries()).every(
      ([lineId, candidateQuantity]) =>
        Math.max(0, baseOccupiedByLineId.get(lineId) || 0) -
          Math.max(0, freedByLineId.get(lineId) || 0) +
          candidateQuantity <=
        Math.max(0, lineCapacityByLineId.get(lineId) || 0),
    );
    if (!fitsAfterRemoval) continue;

    bestSubset = removedWinnerIndices;
    bestSubsetSavings = removedSavings;
    bestSubsetCount = removedWinnerIndices.length;
  }

  if (bestSubset) {
    return bestSubset;
  }

  return chooseProductWinnerIndicesToReplaceGreedy(
    remainingOverCapacityByLineId,
    winnerIndicesTouchingOverCapacity,
    winners,
  );
}

/**
 * 把一个可拆候选缩到给定的每行数量（丢弃数量为 0 的 target），
 * 其余字段（message / value / associatedDiscountCode）保持不变。
 */
function trimCandidateToQuantities(
  candidate: ProductDiscountCandidate,
  quantitiesByLineId: Map<string, number>,
): ProductDiscountCandidate {
  const trimmedTargets = (candidate.targets ?? [])
    .map((target) => {
      const lineId = String(target.cartLine?.id || "").trim();
      const quantity = quantitiesByLineId.get(lineId) ?? 0;
      return quantity > 0 ? { cartLine: { id: lineId, quantity } } : null;
    })
    .filter((target): target is { cartLine: { id: string; quantity: number } } => target !== null);

  return {
    ...candidate,
    targets: trimmedTargets,
  };
}

export function resolveExclusiveProductCandidates(
  candidates: ProductDiscountCandidate[],
  cartLines: CartInput["cart"]["lines"],
  divisibleCandidates: Set<ProductDiscountCandidate> = new Set(),
): ProductDiscountCandidate[] {
  const unitPriceByLineId = new Map<string, number>(
    cartLines.map((line) => [
      line.id,
      parseMoneyAmount(line.cost?.amountPerQuantity?.amount),
    ]),
  );
  const lineCapacityByLineId = new Map<string, number>(
    cartLines.map((line) => [
      line.id,
      Math.max(0, Math.trunc(Number(line.quantity) || 0)),
    ]),
  );
  const winners: Array<{
    candidate: ProductDiscountCandidate;
    targetLineIds: string[];
    targetQuantitiesByLineId: Map<string, number>;
    savings: number;
    index: number;
  }> = [];

  for (const [index, candidate] of candidates.entries()) {
    const targetQuantitiesByLineId = getCandidateTargetQuantities(candidate);
    const targetLineIds = Array.from(targetQuantitiesByLineId.keys());
    if (!targetLineIds.length) {
      winners.push({
        candidate,
        targetLineIds,
        targetQuantitiesByLineId,
        savings: estimateCandidateSavings(candidate, unitPriceByLineId),
        index,
      });
      continue;
    }

    const savings = estimateCandidateSavings(candidate, unitPriceByLineId);
    const conflictingWinnerIndices = chooseProductWinnerIndicesToReplace(
      targetQuantitiesByLineId,
      winners,
      lineCapacityByLineId,
    );

    if (!conflictingWinnerIndices.length) {
      winners.push({
        candidate,
        targetLineIds,
        targetQuantitiesByLineId,
        savings,
        index,
      });
      continue;
    }

    const conflictingSavings = conflictingWinnerIndices.reduce(
      (sum, winnerIndex) => sum + winners[winnerIndex].savings,
      0,
    );

    // 可拆候选（数量阶梯）冲突时，比较两个方案取较优：
    //   方案 A「裁剪」：保留现有 winner，本候选只吃每行的剩余空闲单位。
    //   方案 B「驱逐」：挤掉节省最少的冲突 winner 子集，本候选按全量落地。
    // 净收益 = 全量节省 − 被挤掉的节省；仅当它严格大于裁剪方案才驱逐，
    // 否则共存（裁剪）。这样既保留"多优惠分吃同一商品不同单位"的能力，
    // 又让数量阶梯在确实更省时能挤掉 BXGY/bundle，去除硬编码模块优先级。
    if (divisibleCandidates.has(candidate)) {
      const occupiedByLineId = new Map<string, number>();
      for (const winner of winners) {
        for (const [winnerLineId, winnerQty] of winner.targetQuantitiesByLineId.entries()) {
          occupiedByLineId.set(
            winnerLineId,
            (occupiedByLineId.get(winnerLineId) || 0) + winnerQty,
          );
        }
      }

      const trimmedQuantitiesByLineId = new Map<string, number>();
      for (const [lineId, requestedQty] of targetQuantitiesByLineId.entries()) {
        const lineCapacity = Math.max(0, lineCapacityByLineId.get(lineId) || 0);
        const freeQty = Math.max(0, lineCapacity - (occupiedByLineId.get(lineId) || 0));
        const grantedQty = Math.min(requestedQty, freeQty);
        if (grantedQty > 0) {
          trimmedQuantitiesByLineId.set(lineId, grantedQty);
        }
      }

      const trimmedCandidate = trimCandidateToQuantities(candidate, trimmedQuantitiesByLineId);
      const trimmedSavings = estimateCandidateSavings(trimmedCandidate, unitPriceByLineId);
      const evictNetGain = savings - conflictingSavings;

      if (!(evictNetGain > trimmedSavings && evictNetGain > 0)) {
        if (trimmedSavings > 0) {
          const trimmedTargetLineIds = Array.from(trimmedQuantitiesByLineId.keys());
          log("product_candidate_trimmed", {
            targetLineIds: trimmedTargetLineIds,
            requestedQuantities: Array.from(targetQuantitiesByLineId.entries()),
            grantedQuantities: Array.from(trimmedQuantitiesByLineId.entries()),
            trimmedSavings: trimmedSavings.toFixed(4),
          });
          winners.push({
            candidate: trimmedCandidate,
            targetLineIds: trimmedTargetLineIds,
            targetQuantitiesByLineId: trimmedQuantitiesByLineId,
            savings: trimmedSavings,
            index,
          });
        }
        continue;
      }
      // evictNetGain 更优：落入下方驱逐逻辑，按全量挤掉冲突 winner。
    } else if (savings <= conflictingSavings) {
      continue;
    }

    const previousTargetLineIds = Array.from(
      new Set(
        conflictingWinnerIndices.flatMap((winnerIndex) => winners[winnerIndex].targetLineIds),
      ),
    );
    log("product_candidate_conflict_resolved", {
      previousTargetLineIds,
      nextTargetLineIds: targetLineIds,
      previousSavings: conflictingSavings.toFixed(4),
      nextSavings: savings.toFixed(4),
    });

    const conflictingWinnerIndexSet = new Set(conflictingWinnerIndices);
    const nextWinners = winners.filter((_, winnerIndex) => !conflictingWinnerIndexSet.has(winnerIndex));
    nextWinners.push({
      candidate,
      targetLineIds,
      targetQuantitiesByLineId,
      savings,
      index,
    });
    winners.length = 0;
    winners.push(...nextWinners);
  }

  return winners
    .sort((a, b) => a.index - b.index)
    .map((winner) => winner.candidate);
}
