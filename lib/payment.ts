/** Payment rules with no database access, safe to use in the browser too. */

/** "cod" is kept only so cash orders placed before bank transfer existed still read correctly. */
export type PaymentMethod = "bank" | "gcash" | "cod";
/** The ways a customer can pay at checkout today. */
export type CheckoutPayment = "bank" | "gcash";

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export type ProofMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf";

const startsWith = (data: Uint8Array, sig: number[], at = 0) => sig.every((b, i) => data[at + i] === b);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

/**
 * What a receipt file really is, judged by its first bytes rather than its name or the browser's claim.
 * Anything that is not a photo or a PDF returns null and is refused.
 */
export function detectProofType(data: Uint8Array): ProofMime | null {
  if (data.length < 4) return null;
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(data, ascii("RIFF")) && startsWith(data, ascii("WEBP"), 8)) return "image/webp";
  if (startsWith(data, ascii("ftyp"), 4) && ["heic", "heix", "hevc", "mif1", "msf1", "heif"].some((b) => startsWith(data, ascii(b), 8)))
    return "image/heic";
  if (startsWith(data, ascii("%PDF-"))) return "application/pdf";
  return null;
}

export function paymentLabel(method: PaymentMethod, pickup: boolean): string {
  if (method === "bank") return "Bank transfer";
  if (method === "gcash") return "GCash";
  return pickup ? "Cash on pickup" : "Cash on delivery";
}
