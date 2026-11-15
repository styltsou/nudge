/**
 * Terminal colours. Green, not the coral web brand: in a terminal, red-ish
 * text reads as an error. Plain text when colour is off.
 */
const enabled =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  (!!process.env.FORCE_COLOR || !!process.stdout.isTTY);
const rgb = (r: number, g: number, b: number) => (text: string) =>
  enabled ? `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m` : text;
const bg = (r: number, g: number, b: number) => (text: string) =>
  enabled ? `\x1b[48;2;${r};${g};${b}m\x1b[38;2;0;0;0m${text}\x1b[0m` : text;
export const brand = {
  /** Success green (the website's --color-accept, lifted for dark terminals). */
  accent: rgb(63, 163, 122),
  /** Muted: --color-gray-400 #939393 */
  muted: rgb(147, 147, 147),
  badge: (text: string) => (enabled ? bg(63, 163, 122)(` ${text} `) : text),
  bold: (text: string) => (enabled ? `\x1b[1m${text}\x1b[22m` : text),
};
