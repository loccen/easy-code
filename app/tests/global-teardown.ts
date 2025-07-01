import { config } from 'dotenv';
import path from 'path';
import { cleanupTestData } from './test-data-setup';

// 加载环境变量
config({ path: path.join(process.cwd(), '.env.local') });

async function globalTeardown() {
  console.log('🧹 清理E2E测试环境...');
  
  try {
    await cleanupTestData();
    console.log('✅ E2E测试环境清理完成');
  } catch (error) {
    console.error('❌ E2E测试环境清理失败:', error);
    // 不抛出错误，避免影响测试结果报告
  }
}

export default globalTeardown;
