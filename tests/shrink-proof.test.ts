import sharp from "sharp";
import { expect, test } from "vitest";
import { detectProofType } from "@/lib/payment";
import { PROOF_MAX_EDGE, shrinkProof } from "@/lib/shrink-proof";

async function photo(width: number, height: number, format: "png" | "jpeg" = "png"): Promise<Uint8Array> {
  const noise = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 7919) % 251;
  return new Uint8Array(await sharp(noise, { raw: { width, height, channels: 3 } }).toFormat(format).toBuffer());
}

test("a big photo receipt is re-encoded as a JPEG no larger than the maximum edge", async () => {
  // A real photo, blown up to phone-camera size and saved as PNG the way a screenshot would be.
  const original = new Uint8Array(await sharp("public/products/cover-1-v2.jpg").resize(2400, 2400).png().toBuffer());
  const out = await shrinkProof({ name: "receipt.png", data: original });
  expect(out.data.length).toBeLessThan(original.length / 10);
  expect(detectProofType(out.data)).toBe("image/jpeg");
  const meta = await sharp(out.data).metadata();
  expect(Math.max(meta.width!, meta.height!)).toBe(PROOF_MAX_EDGE);
  expect(out.name).toBe("receipt.jpg");
});

test("a small photo is left as it is", async () => {
  const original = await photo(400, 300, "jpeg");
  const out = await shrinkProof({ name: "small.jpg", data: original });
  expect(out.data).toBe(original);
  expect(out.name).toBe("small.jpg");
});

test("PDFs and files sharp cannot read pass through unchanged", async () => {
  const pdf = new Uint8Array(Buffer.from("%PDF-1.4 not really a pdf but big enough to matter " + "x".repeat(600_000)));
  expect((await shrinkProof({ name: "r.pdf", data: pdf })).data).toBe(pdf);
  const junk = new Uint8Array(Buffer.from("\xff\xd8\xff" + "y".repeat(600_000), "latin1"));
  expect((await shrinkProof({ name: "r.jpg", data: junk })).data).toBe(junk);
});
