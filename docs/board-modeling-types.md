# PCB板子建模类型说明

## 概述

根据IDX v4.5规范第46-61页的要求，PCB板子有两种主要的建模类型：`BOARD_OUTLINE` 和 `BOARD_AREA_RIGID`。本文档详细说明这两种类型的区别、应用场景和实现方式。

## 两种板子类型对比

| 特性 | BOARD_OUTLINE | BOARD_AREA_RIGID |
|------|---------------|------------------|
| **定义对象** | 简单板子整体 | 板子内的特定区域 |
| **层次级别** | 板子顶级定义 | 板子内部区域定义 |
| **层堆叠关联** | 无（直接厚度） | 必须关联层堆叠 |
| **Z轴参考** | 绝对Z坐标 | 相对层堆叠 |
| **AssembleToName** | 无 | 必须有 |
| **典型应用** | 单层/简单板 | 多层板、刚柔结合板 |
| **几何形状** | 整个板子轮廓 | 板子内部某区域轮廓 |

## BOARD_OUTLINE（简单板）

### 特点
- 描述整个PCB板的外部轮廓和整体厚度
- 使用LowerBound/UpperBound定义绝对Z范围
- 通常LowerBound=0, UpperBound=厚度
- **没有AssembleToName属性**
- 适用于单层板或不需要分层详细信息的板子

### 适用场景
- ✅ 单层板
- ✅ 简单多层板（不需要详细层信息）
- ✅ 快速原型设计
- ✅ 概念验证板
- ✅ 整个板子使用相同厚度和材料

### 示例结构
```xml
<foundation:Item geometryType="BOARD_OUTLINE">
  <foundation:Name>SimpleBoard</foundation:Name>
  <pdm:ItemInstance>
    <pdm:Item>板子定义</pdm:Item>
    <!-- 2D变换定义位置 -->
  </pdm:ItemInstance>
  <!-- 注意：没有AssembleToName！ -->
</foundation:Item>
```

## BOARD_AREA_RIGID（刚性区域）

### 特点
- 描述板子内部的一个区域，该区域使用特定的层堆叠
- **必须通过AssembleToName关联到一个层堆叠（Layer Stackup）**
- 几何形状定义该区域的XY范围
- Z范围由关联的层堆叠决定
- 用于多层板、刚柔结合板的不同区域

### 适用场景
- ✅ 多层板（需要详细层信息）
- ✅ 刚柔结合板的刚性区域
- ✅ 需要精确阻抗控制的设计
- ✅ 生产级设计
- ✅ 有不同厚度区域的板子

### 示例结构
```xml
<foundation:Item geometryType="BOARD_AREA_RIGID">
  <foundation:Name>RigidArea1</foundation:Name>
  <pdm:ItemInstance>
    <pdm:Item>区域定义</pdm:Item>
  </pdm:ItemInstance>
  <!-- 关键：关联到层堆叠 -->
  <pdm:AssembleToName>PRIMARY_STACKUP</pdm:AssembleToName>
</foundation:Item>
```

## 实际应用场景

### 场景1：简单单层板
```typescript
// 整个板子就是一个BOARD_OUTLINE
const simpleBoard: BoardData = {
  id: 'SIMPLE_001',
  name: 'Simple Board',
  outline: { /* ... */ },
  // 无layerStackup - 将使用BOARD_OUTLINE类型
};
```

### 场景2：多层板（全部刚性）
```typescript
// 有层叠结构 - 将使用BOARD_AREA_RIGID类型
const multiLayerBoard: BoardData = {
  id: 'MULTI_001',
  name: 'Multi-Layer Board',
  outline: { /* ... */ },
  layerStackup: { /* 层叠定义 */ }, // 关键：有层叠结构
};
```

### 场景3：刚柔结合板
```typescript
// 刚性区域1
const rigidArea1: BoardData = {
  id: 'RIGID_001',
  name: 'Rigid Area 1',
  outline: { /* ... */ },
  layerStackup: rigidStackup, // 刚性层叠
};

// 柔性区域（未来支持）
// const flexArea: BoardData = {
//   geometryType: 'BOARD_AREA_FLEXIBLE',
//   layerStackup: flexStackup
// };
```

## 选择规则

### 使用 BOARD_OUTLINE 当：
- 单层板，无详细层信息
- 简单多层板，不需要层叠细节
- 快速原型或概念设计
- 整个板子使用相同的厚度和材料

### 使用 BOARD_AREA_RIGID 当：
- 多层板，需要详细层信息
- 刚柔结合板的刚性区域
- 需要精确的阻抗控制
- 生产级设计
- 有不同厚度区域的板子

## 实现细节

### BoardBuilder 自动选择逻辑
```typescript
// 根据是否有层叠结构决定板子类型
const hasLayerStackup = processedData.layerStackup && 
                       processedData.layerStackup.layers.length > 0;
const boardType = hasLayerStackup ? 'BOARD_AREA_RIGID' : 'BOARD_OUTLINE';

// 根据板子类型设置 AssembleToName
if (boardType === 'BOARD_AREA_RIGID') {
  // BOARD_AREA_RIGID 必须关联到层堆叠
  boardAssemblyItem.AssembleToName = this.getLayerStackupReferenceName(layerStackup);
}
// BOARD_OUTLINE 不设置 AssembleToName
```

### 关键验证规则
1. **BOARD_OUTLINE**: 不能有 AssembleToName 属性
2. **BOARD_AREA_RIGID**: 必须有 AssembleToName 属性
3. **层叠关联**: BOARD_AREA_RIGID 必须关联到有效的层堆叠
4. **几何一致性**: 板子轮廓必须与层叠厚度一致

## 常见问题

### Q: 有层堆叠信息时，还能用BOARD_OUTLINE吗？
A: 可以，但不推荐。BOARD_OUTLINE是旧式简单表示。如果板子有分层，建议使用BOARD_AREA_RIGID和相关层定义。

### Q: 一个板子可以同时有BOARD_OUTLINE和BOARD_AREA_RIGID吗？
A: 不可以。它们是互斥的板子表示方式：
- BOARD_OUTLINE：完整板子的简单表示
- BOARD_AREA_RIGID：板子内部区域的详细表示

### Q: 如何选择？
| 条件 | 选择 |
|------|------|
| 单层板，无详细层信息 | BOARD_OUTLINE |
| 多层板，需要详细层信息 | BOARD_AREA_RIGID + LAYER_STACKUP |
| 刚柔结合板 | BOARD_AREA_RIGID + BOARD_AREA_FLEXIBLE |
| 有不同厚度区域 | 多个BOARD_AREA_*区域 |

## 参考资料

- IDX v4.5规范第46-61页：板子建模详细说明
- IDX v4.5规范第19页：Item层次结构
- 项目文档：`examples/board-types-demo.ts` - 完整使用示例