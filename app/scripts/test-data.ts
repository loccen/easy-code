#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';

// 加载环境变量
config({ path: path.join(process.cwd(), '.env.local') });

import {
  setupTestEnvironment,
  cleanupTestData,
  verifyTestEnvironment,
  createTestUsers,
  createTestCategories,
  createTestProjects
} from '../tests/test-data-setup';

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      console.log('🚀 设置测试环境...');
      await setupTestEnvironment();
      await verifyTestEnvironment();
      break;
      
    case 'cleanup':
      console.log('🧹 清理测试数据...');
      await cleanupTestData();
      break;
      
    case 'verify':
      console.log('🔍 验证测试环境...');
      const stats = await verifyTestEnvironment();
      console.log('测试环境状态:', stats);
      break;
      
    case 'users':
      console.log('👥 创建测试用户...');
      await createTestUsers();
      break;
      
    case 'categories':
      console.log('📂 创建测试分类...');
      await createTestCategories();
      break;
      
    case 'projects':
      console.log('📦 创建测试项目...');
      await createTestProjects();
      break;
      
    default:
      console.log(`
测试数据管理工具

用法:
  npm run test:data setup     - 设置完整的测试环境
  npm run test:data cleanup   - 清理所有测试数据
  npm run test:data verify    - 验证测试环境状态
  npm run test:data users     - 只创建测试用户
  npm run test:data categories - 只创建测试分类
  npm run test:data projects  - 只创建测试项目

示例:
  npm run test:data setup
  npm run test:e2e
  npm run test:data cleanup
      `);
      process.exit(1);
  }
}

main().catch(console.error);
