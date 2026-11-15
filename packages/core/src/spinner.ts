/** 3x3 grid of squares that fade in a diagonal wave. Styled by the overlay CSS. */
export function spinner(label?: string): HTMLSpanElement {
  const grid = document.createElement('span');
  grid.className = 'spinner';
  if (label) {
    grid.setAttribute('role', 'img');
    grid.setAttribute('aria-label', label);
  } else grid.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('span');
    // Row + column gives each diagonal the same delay, so the wave runs corner to corner.
    cell.style.animationDelay = `${(Math.floor(i / 3) + (i % 3)) * 0.1}s`;
    grid.append(cell);
  }
  return grid;
}
