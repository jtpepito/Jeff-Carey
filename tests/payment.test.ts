import { expect, test } from "vitest";
import { detectProofType, MAX_PROOF_BYTES, paymentLabel } from "@/lib/payment";

const bytes = (...b: number[]) => Uint8Array.from(b);
const ascii = (s: string) => Uint8Array.from(Buffer.from(s, "latin1"));

test("receipt files are recognised by their contents, not their name", () => {
  expect(detectProofType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
  expect(detectProofType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
  expect(detectProofType(ascii("RIFF\x10\x00\x00\x00WEBPVP8 "))).toBe("image/webp");
  expect(detectProofType(ascii("\x00\x00\x00\x18ftypheic\x00\x00"))).toBe("image/heic");
  expect(detectProofType(ascii("\x00\x00\x00\x18ftypmif1\x00\x00"))).toBe("image/heic");
  expect(detectProofType(ascii("%PDF-1.7\n"))).toBe("application/pdf");
});

test("anything else is refused, including a web page dressed up as a picture", () => {
  expect(detectProofType(ascii("<html><script>alert(1)</script>"))).toBeNull();
  expect(detectProofType(ascii("GIF89a"))).toBeNull();
  expect(detectProofType(bytes())).toBeNull();
});

test("the upload limit is 5 MB", () => {
  expect(MAX_PROOF_BYTES).toBe(5 * 1024 * 1024);
});

test("payment labels, including old cash orders", () => {
  expect(paymentLabel("bank", true)).toBe("Bank transfer");
  expect(paymentLabel("gcash", true)).toBe("GCash");
  expect(paymentLabel("cod", true)).toBe("Cash on pickup");
  expect(paymentLabel("cod", false)).toBe("Cash on delivery");
});
