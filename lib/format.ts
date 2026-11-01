export function shortenAddress(value: string, head = 6, tail = 4) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

/** Round decimal strings without converting money through floating-point numbers. */
export function displayMoney(value: string) {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return value;
  const [, sign, whole, fraction = ""] = match;
  const firstNonzero = fraction.search(/[1-9]/);
  const places = BigInt(whole) === 0n && firstNonzero >= 2 ? firstNonzero + 3 : 2;
  const retained = fraction.padEnd(places, "0").slice(0, places);
  let scaled = BigInt(whole + retained);
  if (Number(fraction[places] ?? "0") >= 5) scaled += 1n;
  const digits = scaled.toString().padStart(places + 1, "0");
  const approximate = /[1-9]/.test(fraction.slice(places));
  const prefix = scaled === 0n ? "" : sign;
  return `${approximate ? "≈ " : ""}${prefix}${digits.slice(0, -places)}.${digits.slice(-places)}`;
}
