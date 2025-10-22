# PBXR 表格排序持久化功能

## 功能概述

PBXR的行和列排序设置现在会自动保存到浏览器的本地存储中，确保用户在页面刷新后能够保持自定义的表格布局。

## 实现细节

### 1. 列顺序持久化

- **存储键**: `pbxrColumnOrder`
- **默认顺序**: `['target', 'labels', 'module', 'prober', 'status', 'actions']`
- **触发保存**: 拖拽列标题重排序时自动保存
- **加载时机**: 页面初始化时自动加载保存的列顺序

### 2. 目标行顺序持久化

- **存储键**: `pbxrTargetOrder`
- **存储内容**: 目标ID的数组，按用户自定义顺序排列
- **触发保存**: 
  - 拖拽行重排序时
  - 创建新目标时（添加到末尾）
  - 删除目标时（移除对应ID）
  - 批量删除时（移除所有对应ID）
- **加载时机**: 获取目标数据时自动应用保存的顺序

### 3. 重置功能

在表格操作菜单中新增了"Reset Table Layout"选项，可以：
- 重置列顺序为默认设置
- 清除保存的目标行顺序
- 重新获取数据并按默认顺序显示

## 技术实现

### 数据验证

```typescript
// 列顺序验证
const requiredColumns = ['target', 'labels', 'module', 'prober', 'status', 'actions']
if (Array.isArray(parsed) && requiredColumns.every(col => parsed.includes(col))) {
  setColumnOrder(parsed)
}
```

### 智能合并新目标

```typescript
// 保存的顺序优先，新目标添加到末尾
savedOrder.forEach((id: string) => {
  const target = targetMap.get(id)
  if (target) {
    orderedTargets.push(target)
    seenIds.add(id)
  }
})

// 添加新目标
data.forEach((target: BlackboxTarget) => {
  if (!seenIds.has(target.id)) {
    orderedTargets.push(target)
  }
})
```

## 使用场景

1. **个性化工作流**: 用户可以根据工作优先级排列目标
2. **信息优先级**: 根据使用频率调整列的显示顺序
3. **持续会话**: 关闭浏览器后重新打开仍保持设置
4. **团队协作**: 每个用户可以有自己独立的表格布局

## 存储限制

- 使用浏览器的 `localStorage`，存储在同一域名下
- 数据持久直到用户清除浏览器数据
- 每个浏览器/设备独立存储
- 不占用服务器存储空间

## 错误处理

- 解析失败时自动回退到默认设置
- 损坏的数据会被自动清除
- 新增列会自动添加到默认位置
- 删除的目标会自动从顺序中移除

## 兼容性

- 支持所有现代浏览器
- 不影响现有的排序功能
- 向后兼容，不会破坏现有用户数据
- 可以随时重置为默认设置