import { config } from 'dotenv';
import path from 'path';
import { setupTestEnvironment } from './test-data-setup';

// 加载环境变量
config({ path: path.join(process.cwd(), '.env.local') });

async function globalSetup() {
  console.log('🚀 设置E2E测试环境...');
  
  try {
    await setupTestEnvironment();
    console.log('✅ E2E测试环境设置完成');
  } catch (error) {
    console.error('❌ E2E测试环境设置失败:', error);
    throw error;
  }
}

export default globalSetup;
