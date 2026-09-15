/**
 * 测试环境公共设置：在 node 环境里提供 window/localStorage 桩。
 * - 纯逻辑测试不依赖存储；store 测试可在每个用例里用 resetStorage() 清空。
 * - 需要模拟「刷新」时，配合 vi.resetModules() 后重新导入 store，
 *   store 会从这里的内存存储重新读取，等价于刷新后从 localStorage 重建。
 */

class MemoryLocalStorage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const localStorage = new MemoryLocalStorage();

(globalThis as { window?: unknown }).window = {
  localStorage,
  matchMedia: () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
};
(globalThis as { localStorage?: unknown }).localStorage = localStorage;

/** 测试可调用：清空内存存储，保证用例可重复运行、相互隔离 */
export function resetStorage(): void {
  localStorage.clear();
}
