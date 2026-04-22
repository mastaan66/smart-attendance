import crypto from "crypto";

/**
 * Generates a rolling QR token based on a session seed and current time.
 * Refresh interval is 15 seconds.
 */
export function generateQRToken(seed: string): string {
  const timeStep = Math.floor(Date.now() / 15000);
  return crypto
    .createHmac("sha256", seed)
    .update(timeStep.toString())
    .digest("hex")
    .substring(0, 10); // Shorten for QR density
}

/**
 * Validates a QR token. Checks current and previous time steps to allow
 * for network lag / scan time.
 */
export function validateQRToken(seed: string, token: string): boolean {
  const currentToken = generateQRToken(seed);
  
  // Also check previous token (one step back) to handle lag
  const prevTimeStep = Math.floor(Date.now() / 15000) - 1;
  const prevToken = crypto
    .createHmac("sha256", seed)
    .update(prevTimeStep.toString())
    .digest("hex")
    .substring(0, 10);

  return token === currentToken || token === prevToken;
}
