// Universal Prisma Mock
const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  tenant: { findUnique: jest.fn(), create: jest.fn() },
  session: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  attendance: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  class: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  enrollment: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  schedule: { deleteMany: jest.fn() },
  studentClass: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  leaveRequest: { create: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn((cb) => cb({})),
};

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
  ...mockPrisma
}));

jest.mock("@/lib/redis", () => ({
  __esModule: true,
    del: jest.fn().mockResolvedValue(1),
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    publish: jest.fn().mockResolvedValue(1),
  },
  checkRateLimit: jest.fn().mockResolvedValue({ success: true, remaining: 4 }),
}));

// Global Fetch Mock
global.fetch = jest.fn();

process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/smart_campus_test";
process.env.NEXTAUTH_SECRET = "test-nextauth-secret-with-at-least-32-characters";
process.env.UNIVERSITY_ONBOARDING_TOKEN = "test-onboarding-token";
process.env.JWT_SECRET = "test_secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = "mock_id";
process.env.GOOGLE_CLIENT_SECRET = "mock_secret";
