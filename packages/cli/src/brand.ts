/** Website brand colours for terminal output; plain text when colour is off. */
const enabled =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  (!!process.env.FORCE_COLOR || !!process.stdout.isTTY);
const rgb = (r: number, g: number, b: number) => (text: string) =>
  enabled ? `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m` : text;
const bg = (r: number, g: number, b: number) => (text: string) =>
  enabled ? `\x1b[48;2;${r};${g};${b}m\x1b[38;2;0;0;0m${text}\x1b[0m` : text;
export const brand = {
  /** Accent: --color-accent-500 #e05246 */
  accent: rgb(224, 82, 70),
  /** Soft accent for hints: --color-accent-300 #ffa297 */
  soft: rgb(255, 162, 151),
  /** Muted: --color-gray-400 #939393 */
  muted: rgb(147, 147, 147),
  /** Accept green: --color-accept #217454, lifted for dark terminals */
  ok: rgb(63, 163, 122),
  badge: (text: string) => (enabled ? bg(224, 82, 70)(` ${text} `) : text),
  bold: (text: string) => (enabled ? `\x1b[1m${text}\x1b[22m` : text),
};
