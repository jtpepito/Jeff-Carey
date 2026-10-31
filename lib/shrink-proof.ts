import sharp from "sharp";
import { detectProofType } from "./payment";

/** Receipts are stored in the database, so photos are cut down to this edge before they go in. */
export const PROOF_MAX_EDGE = 1600;
/** Photos already under this size are kept as they are; re-encoding them would gain little. */
const KEEP_UNDER_BYTES = 300 * 1024;

export type Proof = { name: string; data: Uint8Array };

/**
 * Re-encodes a photo receipt as a JPEG no larger than PROOF_MAX_EDGE, with its metadata stripped and its
 * orientation applied. PDFs, small photos and anything sharp cannot decode (HEIC on the server) pass
 * through unchanged; the caller still checks the size and type afterwards.
 */
export async function shrinkProof(proof: Proof): Promise<Proof> {
  const mime = detectProofType(proof.data);
  if (!mime || mime === "application/pdf") return proof;
  try {
    const meta = await sharp(proof.data).metadata();
    const edge = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (proof.data.length < KEEP_UNDER_BYTES && edge <= PROOF_MAX_EDGE) return proof;
    const out = await sharp(proof.data)
      .rotate()
      .resize(PROOF_MAX_EDGE, PROOF_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return { name: proof.name.replace(/\.[A-Za-z0-9]+$/, "") + ".jpg", data: new Uint8Array(out) };
  } catch {
    return proof;
  }
}
