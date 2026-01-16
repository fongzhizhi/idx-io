# XML精度和格式化功能

## 概述

XMLWriter现在支持高级数值精度控制和智能格式化，确保导出的IDX文件具有一致的数值表示和良好的可读性。

## 功能特性

### 1. 可配置的数值精度

XMLWriter支持通过选项配置数值精度：

```typescript
const writer = new XMLWriter({
  numericPrecision: 6,        // 小数位数（默认：6）
  removeTrailingZeros: true   // 移除尾随零（默认：true）
});
```

### 2. 智能数值格式化

根据数值类型自动应用适当的格式化：

- **坐标值** (`formatCoordinate`): X, Y, Z坐标，边界值
- **尺寸值** (`formatDimension`): 直径、宽度、高度、厚度（确保非负）
- **角度值** (`formatAngle`): 旋转角度（规范化到0-360度）
- **通用数值** (`formatNumeric`): 其他数值类型

### 3. 用户属性智能识别

XMLWriter根据属性名称自动选择合适的格式化方法：

```typescript
// 自动识别属性类型并应用相应格式化
UserProperties: [
  { ObjectName: 'Thickness', Value: 1.6 },      // -> 尺寸格式化
  { ObjectName: 'Rotation', Value: 90.0 },      // -> 角度格式化
  { ObjectName: 'PositionX', Value: 10.5 },     // -> 坐标格式化
  { ObjectName: 'CustomValue', Value: 3.14159 } // -> 通用格式化
]
```

### 4. 尾随零处理

当启用 `removeTrailingZeros` 时：
- `10.000000` → `10`
- `20.500000` → `20.5`
- `1.600000` → `1.6`

### 5. 精度控制示例

#### 默认精度（6位小数）
```typescript
const writer = new XMLWriter();
// 10.123456789 → 10.123457
// 20.987654321 → 20.987654
```

#### 自定义精度（3位小数）
```typescript
const writer = new XMLWriter({ numericPrecision: 3 });
// 10.123456 → 10.123
// 20.987654 → 20.988
```

## 应用场景

### 几何元素

```xml
<foundation:CartesianPoint id="POINT_1">
  <d2:X>
    <property:Value>10.123457</property:Value>  <!-- 6位精度 -->
  </d2:X>
  <d2:Y>
    <property:Value>20.987654</property:Value>
  </d2:Y>
</foundation:CartesianPoint>
```

### 曲线集边界

```xml
<d2:LowerBound>
  <property:Value>0</property:Value>  <!-- 尾随零已移除 -->
</d2:LowerBound>
<d2:UpperBound>
  <property:Value>1.6</property:Value>
</d2:UpperBound>
```

### 变换矩阵

```xml
<pdm:Transformation xsi:type="d2:EDMDT RANSFORMATIOND2">
  <d2:xx>1</d2:xx>  <!-- 单位矩阵，尾随零已移除 -->
  <d2:xy>0</d2:xy>
  <d2:yx>0</d2:yx>
  <d2:yy>1</d2:yy>
  <d2:tx>
    <foundation:Value>10.5</foundation:Value>
  </d2:tx>
  <d2:ty>
    <foundation:Value>20.75</foundation:Value>
  </d2:ty>
</pdm:Transformation>
```

## 错误处理

### 无效数值
```typescript
// NaN 或 Infinity → "0" (带警告日志)
formatNumeric(NaN)       // → "0"
formatNumeric(Infinity)  // → "0"
```

### 负尺寸值
```typescript
// 负尺寸值 → 绝对值 (带警告日志)
formatDimension(-5.5)  // → "5.5"
```

### 角度规范化
```typescript
// 角度规范化到 [0, 360)
formatAngle(450)   // → "90"
formatAngle(-90)   // → "270"
```

## 性能考虑

- 数值格式化使用原生 `toFixed()` 方法，性能优异
- 尾随零移除使用正则表达式，对性能影响最小
- 智能属性识别基于字符串匹配，缓存友好

## 兼容性

- 完全兼容 IDX v4.5 规范
- 支持所有现有的 XMLWriter 功能
- XMLWriterWithComments 继承所有精度格式化功能

## 测试验证

所有精度和格式化功能已通过以下测试：

1. ✅ 默认精度格式化（6位小数）
2. ✅ 尾随零移除
3. ✅ 自定义精度设置
4. ✅ 尺寸值格式化
5. ✅ 用户属性智能格式化
6. ✅ 变换矩阵格式化
7. ✅ XML输出格式化和结构验证

## 最佳实践

1. **使用默认设置**：对于大多数PCB设计，默认的6位精度足够
2. **启用尾随零移除**：提高XML可读性，减小文件大小
3. **自定义精度**：仅在特殊需求时调整（如高精度制造）
4. **验证输出**：使用IDX验证工具确保输出符合规范

## 相关文件

- `src/exporter/writers/xml-writer.ts` - 核心实现
- `src/exporter/writers/xml-writer-with-comments.ts` - 带注释版本
- `.kiro/specs/idx-exporter-completion/requirements.md` - 需求6.1-6.3
- `.kiro/specs/idx-exporter-completion/design.md` - 设计文档
