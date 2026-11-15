export function redact(value: string) {
  return value
    .replace(/[a-f0-9]{64}/gi, '[redacted]')
    .replace(/(?:sk-|Bearer\s+)[\w.-]+/gi, '[redacted]')
    .replace(
      /((?:token|password|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi,
      '$1[redacted]',
    );
}
