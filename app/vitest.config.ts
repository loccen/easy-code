import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // 性能优化配置
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
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
    // 超时配置
    testTimeout: 10000, // 10秒
    hookTimeout: 10000, // 10秒
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 80,
          statements: 80,
        },
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/app/**', // Next.js app directory
        'src/components/**/*.stories.*',
        'src/components/**/*.test.*',
        'src/components/**/*.spec.*',
        'scripts/',
        'coverage/',
        'playwright-report/',
        'test-results/',
        '.next/**',
        'dist/**',
        'build/**',
        '**/*.map',
        '**/*.min.js',
      ],
      // 忽略未测试的文件以避免source map问题
      skipFull: true,
      // 只包含我们的源代码
      include: ['src/lib/**/*.ts', 'src/utils/**/*.ts'],
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'coverage', 'playwright-report', 'test-results'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
