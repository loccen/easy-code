import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // 在测试期间静默console输出
    silent: false, // 设为true可以完全静默
    // 或者只静默特定级别的日志
    onConsoleLog: (log, type) => {
      // 过滤掉测试中的预期错误日志
      if (type === 'stderr' && log.includes('失败:')) {
        return false; // 不显示这些日志
      }
      return true; // 显示其他日志
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/app/**', // Next.js app directory
        'src/components/**/*.stories.*',
        'src/components/**/*.test.*',
        'src/components/**/*.spec.*',
      ],
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
