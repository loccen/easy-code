# 易码网 UI 设计系统

## 1. 设计理念

### 1.1 设计原则
- **简洁明了**：界面简洁，信息层次清晰
- **专业可信**：体现技术专业性和平台可信度
- **高效便捷**：优化用户操作流程，提升使用效率
- **包容性**：支持无障碍访问，适配多种设备
- **一致性**：统一的视觉语言和交互模式

### 1.2 目标用户
- **主要用户**：技术开发者（买家和卖家）
- **次要用户**：技术管理者、项目经理
- **使用场景**：桌面端为主，移动端为辅

## 2. 色彩系统

### 2.1 主色调
```css
/* 主品牌色 - 科技蓝 */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* 主色 */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;

/* 辅助色 - 成功绿 */
--success-50: #f0fdf4;
--success-100: #dcfce7;
--success-200: #bbf7d0;
--success-300: #86efac;
--success-400: #4ade80;
--success-500: #22c55e;  /* 成功色 */
--success-600: #16a34a;
--success-700: #15803d;
--success-800: #166534;
--success-900: #14532d;

/* 警告色 - 橙色 */
--warning-50: #fffbeb;
--warning-100: #fef3c7;
--warning-200: #fde68a;
--warning-300: #fcd34d;
--warning-400: #fbbf24;
--warning-500: #f59e0b;  /* 警告色 */
--warning-600: #d97706;
--warning-700: #b45309;
--warning-800: #92400e;
--warning-900: #78350f;

/* 错误色 - 红色 */
--error-50: #fef2f2;
--error-100: #fee2e2;
--error-200: #fecaca;
--error-300: #fca5a5;
--error-400: #f87171;
--error-500: #ef4444;  /* 错误色 */
--error-600: #dc2626;
--error-700: #b91c1c;
--error-800: #991b1b;
--error-900: #7f1d1d;
```

### 2.2 中性色
```css
/* 灰度色系 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* 语义化颜色 */
--background: #ffffff;
--surface: #f9fafb;
--border: #e5e7eb;
--text-primary: #111827;
--text-secondary: #6b7280;
--text-disabled: #9ca3af;
```

## 3. 字体系统

### 3.1 字体族
```css
/* 主字体 - 系统字体栈 */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;

/* 等宽字体 - 代码显示 */
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', 'Source Code Pro', monospace;

/* 数字字体 - 数据展示 */
--font-numeric: 'Inter', 'SF Pro Display', system-ui, sans-serif;
```

### 3.2 字体大小
```css
/* 字体大小系统 */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */

/* 行高 */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 3.3 字重
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## 4. 间距系统

### 4.1 间距标准
```css
/* 8px 基础间距系统 */
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
--space-24: 6rem;    /* 96px */
```

### 4.2 布局间距
```css
/* 容器间距 */
--container-padding: var(--space-4);
--section-spacing: var(--space-16);
--component-spacing: var(--space-8);
--element-spacing: var(--space-4);
```

## 5. 组件系统

### 5.1 按钮组件
```css
/* 主要按钮 */
.btn-primary {
  background-color: var(--primary-500);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: var(--primary-600);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 次要按钮 */
.btn-secondary {
  background-color: transparent;
  color: var(--primary-500);
  border: 1px solid var(--primary-500);
  padding: var(--space-3) var(--space-6);
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
}

/* 危险按钮 */
.btn-danger {
  background-color: var(--error-500);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
}
```

### 5.2 卡片组件
```css
.card {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}
```

### 5.3 表单组件
```css
.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.form-input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: var(--text-base);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-error {
  color: var(--error-500);
  font-size: var(--text-sm);
  margin-top: var(--space-1);
}
```

## 6. 图标系统

### 6.1 图标库选择
- **主要图标库**：Heroicons (Outline & Solid)
- **辅助图标库**：Lucide React
- **技术栈图标**：Simple Icons
- **自定义图标**：SVG格式，24x24px基础尺寸

### 6.2 图标使用规范
```css
.icon {
  width: 1.5rem;
  height: 1.5rem;
  stroke-width: 1.5;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-lg {
  width: 2rem;
  height: 2rem;
}

.icon-xl {
  width: 3rem;
  height: 3rem;
}
```

## 7. 响应式设计

### 7.1 断点系统
```css
/* 移动端优先的响应式断点 */
--breakpoint-sm: 640px;   /* 小屏幕 */
--breakpoint-md: 768px;   /* 平板 */
--breakpoint-lg: 1024px;  /* 笔记本 */
--breakpoint-xl: 1280px;  /* 桌面 */
--breakpoint-2xl: 1536px; /* 大屏幕 */
```

### 7.2 容器系统
```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 640px) {
  .container { max-width: 640px; }
}

@media (min-width: 768px) {
  .container { max-width: 768px; }
}

@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}

@media (min-width: 1280px) {
  .container { max-width: 1280px; }
}
```

## 8. 动画系统

### 8.1 过渡动画
```css
/* 标准过渡 */
--transition-fast: 0.15s ease;
--transition-normal: 0.2s ease;
--transition-slow: 0.3s ease;

/* 缓动函数 */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### 8.2 微交互动画
```css
/* 悬停效果 */
.hover-lift {
  transition: transform var(--transition-normal);
}

.hover-lift:hover {
  transform: translateY(-2px);
}

/* 加载动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading {
  animation: spin 1s linear infinite;
}

/* 淡入动画 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

## 9. 暗色主题

### 9.1 暗色模式变量
```css
[data-theme="dark"] {
  --background: #0f172a;
  --surface: #1e293b;
  --border: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-disabled: #64748b;
  
  /* 调整主色调透明度 */
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
}
```

### 9.2 主题切换
```css
.theme-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: var(--space-2);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.theme-toggle:hover {
  color: var(--text-primary);
  border-color: var(--primary-500);
}
```

## 10. 无障碍设计

### 10.1 对比度要求
- 正常文本：4.5:1 最小对比度
- 大文本：3:1 最小对比度
- 非文本元素：3:1 最小对比度

### 10.2 焦点指示器
```css
.focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* 移除默认焦点样式 */
*:focus {
  outline: none;
}

/* 键盘导航焦点样式 */
*:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### 10.3 屏幕阅读器支持
```css
/* 仅屏幕阅读器可见 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```
