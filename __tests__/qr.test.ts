import { generateQRToken, validateQRToken } from "@/lib/qr";

describe("rotating attendance tokens", () => {
  const seed = "session-seed-that-is-not-public";
  const now = new Date("2026-06-29T10:00:07.000Z").getTime();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("accepts the token for the current 15-second window", () => {
    jest.spyOn(Date, "now").mockReturnValue(now);

    const token = generateQRToken(seed);

    expect(validateQRToken(seed, token)).toBe(true);
  });

  it("accepts one previous window for scan and network delay", () => {
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(now - 15_000);
    const previousToken = generateQRToken(seed);
    nowSpy.mockReturnValue(now);

    expect(validateQRToken(seed, previousToken)).toBe(true);
  });

  it("rejects tokens outside the accepted windows", () => {
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(now + 15_000);
    const futureToken = generateQRToken(seed);
    nowSpy.mockReturnValue(now);

    expect(validateQRToken(seed, futureToken)).toBe(false);
    expect(validateQRToken("another-seed", generateQRToken(seed))).toBe(false);
    expect(validateQRToken(seed, "not-a-token")).toBe(false);
  });
});
