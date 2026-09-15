import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 纯逻辑测试使用 node 环境；localStorage 由 setup 注入文件/内存桩
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // 每个测试文件独立模块作用域，避免 store 单例在文件间串扰
    pool: 'threads',
    reporters: ['default'],
  },
});
