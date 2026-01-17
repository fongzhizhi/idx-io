# IDX 导出器迁移指南

## 概述

本指南帮助您从旧版本的 IDX 导出器迁移到包含协议合规性修复的新版本。新版本完全符合 IDX v4.5 协议规范，修复了多个协议违规问题，并添加了验证功能。

## 版本兼容性

### 向后兼容性保证

✅ **公共 API 接口保持不变** - 现有代码无需修改即可使用  
✅ **输入数据格式兼容** - 支持相同的数据结构  
✅ **导出功能完整** - 所有现有功能继续可用  
✅ **配置选项兼容** - 现有配置继续有效  

### 输出格式变化

⚠️ **XML 输出格式已更新** - 生成的 IDX 文件格式更符合协议规范  
⚠️ **命名空间使用规范化** - XML 命名空间使用更加标准  
⚠️ **几何类型标准化** - 使用 IDX v4.5 标准几何类型值  

## 主要变化

### 1. ProcessInstruction 类型声明

**旧版本输出：**
```xml
<ProcessInstruction xsi:type="foundation:EDMDSendInformation">
```

**新版本输出：**
```xml
<ProcessInstruction xsi:type="computational:EDMDProcessInstructionSendInformation">
```

**影响：** 无需代码修改，输出自动更新

### 2. 形状引用格式

**旧版本输出：**
```xml
<pdm:Shape href="#SHAPE_001"/>
```

**新版本输出：**
```xml
<pdm:Shape>SHAPE_001</pdm:Shape>
```

**影响：** 无需代码修改，输出自动更新

### 3. 几何类型标准化

**旧版本输出：**
```xml
<Item geometryType="VIA">
```

**新版本输出：**
```xml
<Item geometryType="HOLE_PLATED">
<!-- 或 -->
<Item geometryType="FILLED_VIA">
```

**影响：** 无需代码修改，类型自动映射

### 4. 变换矩阵格式

**旧版本输出：**
```xml
<pdm:Transformation xsi:type="d2:EDMDTransformationD2">
  <pdm:tx>10.5</pdm:tx>
  <pdm:ty>20.3</pdm:ty>
</pdm:Transformation>
```

**新版本输出：**
```xml
<pdm:Transformation>
  <pdm:TransformationType>d2</pdm:TransformationType>
  <pdm:tx><foundation:Value>10.5</foundation:Value></pdm:tx>
  <pdm:ty><foundation:Value>20.3</foundation:Value></pdm:ty>
</pdm:Transformation>
```

**影响：** 无需代码修改，格式自动更新

### 5. 用户属性命名空间

**旧版本输出：**
```xml
<property:UserSimpleProperty>
  <property:Key>...</property:Key>
  <property:Value>...</property:Value>
</property:UserSimpleProperty>
```

**新版本输出：**
```xml
<foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
  <property:Key>...</property:Key>
  <property:Value>...</property:Value>
</foundation:UserProperty>
```

**影响：** 无需代码修改，命名空间自动规范

## 迁移步骤

### 步骤 1：更新依赖

```bash
npm update idx-io
# 或
yarn upgrade idx-io
```

### 步骤 2：启用验证功能（推荐）

在现有代码中添加验证配置：

```typescript
// 旧版本配置
const exporter = new IDXExporter({
  output: { designName: 'MyBoard' },
  geometry: { useSimplified: true }
});

// 新版本配置（添加验证）
const exporter = new IDXExporter({
  output: { designName: 'MyBoard' },
  geometry: { useSimplified: true },
  validation: {
    enabled: true,           // 启用验证
    strictMode: false,       // 非严格模式
    reportWarnings: true     // 报告警告
  }
});
```

### 步骤 3：处理验证结果

更新导出结果处理逻辑：

```typescript
// 旧版本
const result = await exporter.export(data);
if (result.success) {
  // 处理成功结果
}

// 新版本（添加验证处理）
const result = await exporter.export(data);
if (result.success) {
  // 检查验证结果
  if (result.validation) {
    if (result.validation.valid) {
      console.log('✅ IDX 文件完全符合协议规范');
    } else {
      console.warn('⚠️ 发现协议合规性问题:');
      result.validation.errors.forEach(error => {
        console.error(`- ${error.message}`);
      });
    }
  }
  
  // 处理成功结果
}
```

### 步骤 4：更新测试用例

如果您有测试用例验证 XML 输出，需要更新预期结果：

```typescript
// 更新测试中的预期 XML 格式
expect(xml).toContain('computational:EDMDProcessInstructionSendInformation');
expect(xml).toContain('<pdm:Shape>SHAPE_001</pdm:Shape>');
expect(xml).not.toContain('href="#SHAPE_001"');
```

## 常见问题

### Q: 现有代码是否需要修改？

**A:** 不需要。所有公共 API 接口保持不变，现有代码可以直接使用新版本。

### Q: 生成的 IDX 文件格式发生了什么变化？

**A:** XML 结构更加符合 IDX v4.5 协议规范，包括：
- 正确的命名空间使用
- 标准的几何类型值
- 规范的元素格式
- 完整的组件结构

### Q: 如何验证迁移是否成功？

**A:** 启用验证功能并检查验证结果：

```typescript
const exporter = new IDXExporter({
  // ... 其他配置
  validation: { enabled: true }
});

const result = await exporter.export(data);
if (result.validation?.valid) {
  console.log('✅ 迁移成功，文件完全合规');
}
```

### Q: 验证功能会影响性能吗？

**A:** 验证功能的性能开销很小（通常 < 20%），可以根据需要启用或禁用：

```typescript
// 开发环境启用验证
const isDevelopment = process.env.NODE_ENV === 'development';

const exporter = new IDXExporter({
  validation: {
    enabled: isDevelopment  // 仅在开发环境启用
  }
});
```

### Q: 如何处理验证失败的情况？

**A:** 验证失败通常表示输入数据有问题，可以根据错误信息进行修复：

```typescript
if (result.validation && !result.validation.valid) {
  result.validation.errors.forEach(error => {
    console.error(`错误: ${error.message}`);
    if (error.suggestion) {
      console.log(`建议: ${error.suggestion}`);
    }
  });
}
```

## 新功能

### 1. 协议合规性验证

新版本提供完整的 IDX v4.5 协议合规性验证：

```typescript
const exporter = new IDXExporter({
  validation: {
    enabled: true,           // 启用验证
    strictMode: false,       // 严格模式
    reportWarnings: true     // 报告警告
  }
});
```

### 2. 详细的错误报告

验证功能提供详细的错误信息和修复建议：

```typescript
result.validation.errors.forEach(error => {
  console.log(`错误代码: ${error.code}`);
  console.log(`错误信息: ${error.message}`);
  console.log(`错误位置: ${error.location}`);
  console.log(`修复建议: ${error.suggestion}`);
});
```

### 3. 标准几何类型支持

自动使用 IDX v4.5 标准几何类型：

- `VIA` → `HOLE_PLATED` 或 `FILLED_VIA`
- 自动选择最合适的标准类型
- 完整的类型验证

### 4. 改进的组件结构

组件现在使用完整的三层结构：

- Assembly Item（顶层容器）
- Single Item（中间定义）
- Shape Elements（底层几何）

## 最佳实践

### 1. 启用验证功能

```typescript
// 推荐配置
const exporter = new IDXExporter({
  validation: {
    enabled: true,
    strictMode: false,      // 开始时使用非严格模式
    reportWarnings: true
  }
});
```

### 2. 处理验证结果

```typescript
const result = await exporter.export(data);

// 总是检查验证结果
if (result.validation) {
  if (!result.validation.valid) {
    // 记录问题但不阻止使用
    console.warn('IDX 文件存在协议合规性问题');
    logValidationIssues(result.validation);
  }
}

// 继续正常处理
if (result.success) {
  // 使用导出结果
}
```

### 3. 渐进式迁移

```typescript
// 第一阶段：启用验证但不强制
const exporter = new IDXExporter({
  validation: { enabled: true, strictMode: false }
});

// 第二阶段：修复所有问题后启用严格模式
const exporter = new IDXExporter({
  validation: { enabled: true, strictMode: true }
});
```

## 支持和帮助

如果在迁移过程中遇到问题：

1. **查看验证错误信息** - 通常包含详细的修复建议
2. **参考示例代码** - `examples/validation-example.ts`
3. **查看技术文档** - `.kiro/specs/idx-protocol-compliance-fixes/`
4. **检查测试用例** - 了解预期的输入输出格式

## 总结

新版本的 IDX 导出器提供了完全的 IDX v4.5 协议合规性，同时保持了向后兼容性。主要优势：

✅ **零代码修改** - 现有代码直接可用  
✅ **完全合规** - 生成的文件符合 IDX v4.5 规范  
✅ **验证功能** - 实时检查协议合规性  
✅ **详细报告** - 提供修复建议和错误定位  
✅ **性能优化** - 验证开销最小化  

建议所有用户升级到新版本以获得更好的协议兼容性和验证功能。