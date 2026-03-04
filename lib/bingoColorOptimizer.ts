/**
 * Bingo card color optimizer — constraint solver + validator.
 *
 * Reassigns category colors to cells in an N×N grid so that:
 *   Hard constraint : no two orthogonally or diagonally adjacent cells share a color.
 *   Soft constraints: even color distribution, no row/column dominated by one color.
 *
 * Uses backtracking with forward-checking and a soft-score objective.
 */

/** A flat representation of a bingo grid cell (goal or free center). */
export type BingoCellKind = { kind: 'goal' } | { kind: 'free' };

/** 2-D grid of color hex strings (null = no color / free center). */
export type ColorGrid = (string | null)[][];

/**
 * Optimise color assignment for an N×N bingo grid.
 * Returns a 2-D ColorGrid, or null if the palette has too few colors to satisfy
 * the hard adjacency constraint (e.g. a 3×3 grid needs at least 4 colors).
 */
export function optimizeColors(
  /** Flat cell array (length = N×N). The free center is exempt from coloring. */
  grid: { kind: string }[],
  palette: string[],
  size: number
): ColorGrid | null {
  if (palette.length === 0) return null;

  const total = size * size;
  const freeIdx = Math.floor(total / 2);

  // Build 8-directional neighbour list for each cell index.
  const neighbours = (idx: number): number[] => {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const result: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          result.push(r * size + c);
        }
      }
    }
    return result;
  };

  const assignment: (string | null)[] = Array(total).fill(null);
  const colorCount = new Map<string, number>();
  palette.forEach((c) => colorCount.set(c, 0));

  // Soft score for a candidate color at a given cell index.
  // Lower = better (prefers less-used colors and avoids same-row/column repeats).
  const softScore = (idx: number, color: string): number => {
    let score = colorCount.get(color) ?? 0;
    const row = Math.floor(idx / size);
    const col = idx % size;
    for (let c2 = 0; c2 < size; c2++) {
      if (c2 !== col && assignment[row * size + c2] === color) score += 3;
    }
    for (let r2 = 0; r2 < size; r2++) {
      if (r2 !== row && assignment[r2 * size + col] === color) score += 3;
    }
    return score;
  };

  const solve = (cellIdx: number): boolean => {
    if (cellIdx === total) return true;
    if (cellIdx === freeIdx) return solve(cellIdx + 1);

    const usedByNeighbours = new Set<string>(
      neighbours(cellIdx)
        .map((n) => assignment[n])
        .filter(Boolean) as string[]
    );

    const candidates = palette
      .filter((c) => !usedByNeighbours.has(c))
      .sort((a, b) => softScore(cellIdx, a) - softScore(cellIdx, b));

    for (const color of candidates) {
      assignment[cellIdx] = color;
      colorCount.set(color, (colorCount.get(color) ?? 0) + 1);
      if (solve(cellIdx + 1)) return true;
      assignment[cellIdx] = null;
      colorCount.set(color, (colorCount.get(color) ?? 1) - 1);
    }
    return false;
  };

  if (!solve(0)) return null;

  // Reshape flat array into 2-D grid.
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => assignment[r * size + c])
  );
}

/**
 * Validate an existing color assignment and return human-readable rule violations.
 * Useful for regression tests and debugging.
 */
export function validateColors(colorGrid: ColorGrid, palette: string[]): string[] {
  const size = colorGrid.length;
  const violations: string[] = [];
  const freeRow = Math.floor(size / 2);
  const freeCol = Math.floor(size / 2);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === freeRow && c === freeCol) continue;
      const color = colorGrid[r][c];
      if (!color) {
        violations.push(`Cell (${r},${c}) has no color assigned.`);
        continue;
      }
      if (!palette.includes(color)) {
        violations.push(`Cell (${r},${c}) color "${color}" is not in the palette.`);
      }
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (nr === freeRow && nc === freeCol) continue;
            if (colorGrid[nr][nc] === color) {
              violations.push(
                `Adjacent cells (${r},${c}) and (${nr},${nc}) share color "${color}".`
              );
            }
          }
        }
      }
    }
  }
  return violations;
}
