# PBXR 品牌更新

## 概述

已成功将应用程序从"Blackbox Target Manager"重新品牌为"PBXR"，并更新了相关的图标、文本和配置。

## 🎨 主要更改

### 1. 应用名称和标识

**更改前**:
- 名称: Blackbox Target Manager
- 描述: Manage your Blackbox exporter targets
- 图标: 无

**更改后**:
- 名称: PBXR
- 描述: Manage your monitoring targets
- 图标: Lucide Activity图标
  - 主页面: `<Activity className="w-8 h-8 text-gray-900" />`
  - 登录页面: `<Activity className="w-8 h-8 text-gray-900" />` (与主页面相同)

### 2. 界面文本更新

#### 主页面头部
```jsx
// 更新前
<h1>Blackbox Target Manager</h1>
<p>Manage your Blackbox exporter targets</p>

// 更新后
<div className="flex items-center gap-3">
  <Activity className="w-8 h-8 text-gray-900" />
  <div>
    <h1 className="text-2xl font-bold text-gray-900">PBXR</h1>
    <p className="text-sm text-gray-600">Manage your monitoring targets</p>
  </div>
</div>
```

#### 登录页面
```jsx
// 更新前
<CardHeader>
  <CardTitle>Blackbox Target Manager</CardTitle>
  <CardDescription>Manage your Blackbox exporter targets</CardDescription>
</CardHeader>

// 更新后
<CardHeader>
  <div className="flex items-center gap-3">
    <Activity className="w-8 h-8 text-gray-900" />
    <div>
      <CardTitle className="text-2xl">PBXR</CardTitle>
      <CardDescription>Manage your monitoring targets</CardDescription>
    </div>
  </div>
</CardHeader>
```

#### 对话框描述
- **创建/编辑目标对话框**: "Update the monitoring target" / "Create a new monitoring target"
- **配置导出对话框**: "PBXR configuration in JSON format"

### 3. 文件命名

**下载文件名**:
- 更新前: `blackbox-targets.json`
- 更新后: `pbxr-targets.json`

### 4. 本地存储键名

**持久化存储键**:
- 列顺序: `blackboxColumnOrder` → `pbxrColumnOrder`
- 目标顺序: `blackboxTargetOrder` → `pbxrTargetOrder`

## 🔧 技术实现

### 图标集成
```jsx
import { Activity } from 'lucide-react'

// 在主页面头部使用
<Activity className="w-8 h-8 text-gray-900" />

// 在登录页面使用 (水平布局)
<Activity className="w-8 h-8 text-gray-900" />
```

### 存储迁移
所有localStorage键名都已更新，确保：
- 新用户使用新的键名
- 现有用户的设置需要重新配置（由于键名变更）
- 重置功能正确清除新的键名

## 📱 用户体验

### 视觉改进
- **专业外观**: 简洁的PBXR名称配合Activity图标
- **现代设计**: 水平布局的logo和标题
- **一致性**: 黑色图标与标题字体颜色保持一致
- **统一布局**: 登录页面和主页面使用相同的水平布局设计

### 功能保持
所有现有功能完全保持不变：
- ✅ 目标管理
- ✅ 排序和过滤
- ✅ 标签系统
- ✅ 探针分配
- ✅ 配置导出
- ✅ 持久化存储

## 🎯 品牌定位

### PBXR含义
- **P**: Performance/Probe
- **B**: Blackbox/Monitoring
- **X**: eXport/Exchange
- **R**: Reporter/Response

### 设计理念
- **简洁性**: 短小精悍的名称易于记忆
- **专业性**: Activity图标传达监控和活跃性
- **现代感**: 符合当代UI设计趋势

## 📝 注意事项

### 数据迁移
由于localStorage键名变更，现有用户将：
- 失去保存的列顺序设置
- 失去保存的目标行顺序设置
- 需要重新配置他们的偏好设置

### 建议操作
1. 通知用户关于品牌更新的信息
2. 提供设置重置的说明
3. 确保用户了解功能保持不变

## 🚀 未来扩展

新的PBXR品牌为未来功能扩展提供了更好的基础：
- 更灵活的命名空间
- 更专业的品牌形象
- 更好的市场定位

---

**更新日期**: 2024年当前日期  
**版本**: v2.0 (品牌更新版本)  
**状态**: ✅ 完成