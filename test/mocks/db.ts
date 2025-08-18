import { vi } from 'vitest'

export const mockDb = {
  get: vi.fn(),
  set: vi.fn(),
  hget: vi.fn(),
  hset: vi.fn(),
  hgetall: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  zadd: vi.fn(),
  zrange: vi.fn(),
  zrem: vi.fn(),
  pipeline: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    hget: vi.fn(),
    hset: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    exec: vi.fn(),
  })),
}

vi.mock('@vercel/kv', () => ({
  ...vi.importActual('@vercel/kv'),
  db: mockDb,
}))
