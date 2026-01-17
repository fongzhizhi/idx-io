# Design Document: IDX Protocol Compliance Fixes

## Overview

本设计文档描述了 IDX 导出器协议合规性修复的技术实现方案。当前的 IDX 导出器在生成 IDX V4.5 格式文件时存在多个协议违规问题，这些问题涉及 XML 结构、命名空间使用、几何类型定义、组件结构等多个方面。

本设计采用渐进式修复策略，优先修复严重的结构性问题，然后完善功能性问题，最后添加验证和测试机制。设计遵循以下原则：

1. **最小侵入性**：尽可能保持现有代码结构，只修改必要的部分
2. **向后兼容**：保持公共 API 接口不变，确保现有用户代码无需修改
3. **可测试性**：每个修复都配有相应的测试用例
4. **可验证性**：提供 XSD Schema 验证功能，确保输出符合协议

### 修复优先级

**P0 - 严重问题（必须修复）**：
- ProcessInstruction 类型声明错误
- 形状引用格式错误
- 命名空间使用混乱

**P1 - 重要问题（强烈建议修复）**：
- 组件结构不完整
- 几何类型使用错误
- 变换矩阵格式错误

**P2 - 优化问题（建议修复）**：
- ItemType 使用不当
- ShapeDescriptionType 值优化
- 基线和属性格式规范

**P3 - 增强功能（可选）**：
- Z 轴定位系统
- 层堆叠结构完善
- ShapeElement 布尔运算

## Architecture

### 整体架构

IDX 导出器采用分层架构，修复工作主要集中在 XML 序列化层：

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (examples/export-with-layers.ts)       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Exporter Layer                  │
│  (src/exporter/idx-exporter.ts)         │
│  - 数据转换                              │
│  - 结构组织                              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Writer Layer                    │
│  (src/exporter/writers/xml-writer.ts)   │
│  - XML 序列化  ← 主要修复区域            │
│  - 命名空间管理                          │
│  - 格式化输出                            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Type Layer                      │
│  (src/types/core/*)                     │
│  - 数据模型定义                          │
│  - 类型约束                              │
└─────────────────────────────────────────┘
```

### 修复策略

采用**分阶段修复**策略，每个阶段独立可测试：

**阶段 1：XML 结构修复**
- 修复 ProcessInstruction 类型声明
- 修复形状引用格式
- 规范命名空间使用

**阶段 2：几何和组件修复**
- 修复几何类型使用
- 完善组件三层结构
- 修正变换矩阵格式

**阶段 3：类型和属性修复**
- 修正 ItemType 使用
- 统一 CurveSet2d 命名
- 规范基线和属性格式

**阶段 4：高级功能增强**
- 实现 Z 轴定位系统
- 完善层堆叠结构
- 实现 ShapeElement 布尔运算

## Components and Interfaces

### 核心组件

#### 1. XMLWriter 类（主要修改目标）

**职责**：
- 将内部数据结构序列化为符合 IDX V4.5 规范的 XML
- 管理 XML 命名空间
- 格式化数值和坐标

**主要修改点**：

```typescript
export class XMLWriter {
  // 现有属性
  private namespaces: Record<string, string>;
  private prettyPrint: boolean;
  private encoding: string;
  private numericFormat: NumericFormatConfig;
  
  // 新增：协议版本配置
  private protocolVersion: '4.0' | '4.5';
  
  // 新增：验证选项
  private validationEnabled: boolean;
  
  // 修改的方法
  private buildProcessInstruction(root: any, instruction: EDMDProcessInstruction): void;
  private buildItem(parent: any, item: EDMDItem): void;
  private buildUserProperty(parent: any, prop: any): void;
  private buildTransformation(parent: any, transformation: any): void;
  private buildShape(parent: any, shape: any): void;
  
  // 新增的方法
  private buildComponentAssembly(parent: any, component: ComponentData): void;
  private buildLayerStackup(parent: any, stackup: LayerStackupData): void;
  private validateOutput(xml: string): ValidationResult;
}
```

#### 2. 命名空间管理器（新增）

**职责**：
- 集中管理所有 XML 命名空间
- 提供类型到命名空间的映射
- 确保命名空间使用的一致性

```typescript
export class NamespaceManager {
  // 标准命名空间定义
  private static readonly NAMESPACES = {
    foundation: 'http://www.prostep.org/EDMD/Foundation',
    pdm: 'http://www.prostep.org/EDMD/PDM',
    d2: 'http://www.prostep.org/EDMD/2D',
    d3: 'http://www.prostep.org/EDMD/3D',
    property: 'http://www.prostep.org/EDMD/Property',
    computational: 'http://www.prostep.org/EDMD/Computational',
    administration: 'http://www.prostep.org/EDMD/Administration',
    xsi: 'http://www.w3.org/2001/XMLSchema-instance'
  };
  
  // 类型到命名空间的映射
  getNamespaceForType(typeName: string): string;
  
  // 获取完整的命名空间声明
  getAllNamespaces(): Record<string, string>;
  
  // 验证命名空间使用
  validateNamespaceUsage(elementName: string, namespace: string): boolean;
}
```

#### 3. 几何类型映射器（新增）

**职责**：
- 将内部几何类型映射到 IDX 标准几何类型
- 处理简化表示和传统表示的选择
- 验证几何类型的有效性

```typescript
export class GeometryTypeMapper {
  // 标准几何类型（来自协议表 8）
  private static readonly STANDARD_GEOMETRY_TYPES = [
    'BOARD_OUTLINE',
    'COMPONENT',
    'HOLE_PLATED',
    'HOLE_NON_PLATED',
    'FILLED_VIA',
    'KEEPOUT',
    'LAYER_STACKUP',
    // ... 其他标准类型
  ];
  
  // 映射内部类型到 IDX 类型
  mapToIDXType(internalType: string, context?: any): string | null;
  
  // 判断是否应使用简化表示
  shouldUseSimplifiedRepresentation(type: string): boolean;
  
  // 验证几何类型
  isValidGeometryType(type: string): boolean;
}
```

#### 4. 组件结构构建器（新增）

**职责**：
- 构建符合协议的三层组件结构
- 管理 assembly、single 和 shape 之间的引用关系
- 处理组件的位置和变换

```typescript
export class ComponentStructureBuilder {
  // 构建完整的组件结构
  buildComponentStructure(component: ComponentData): {
    assemblyItem: EDMDItem;
    singleItem: EDMDItem;
    shapeElements: any[];
  };
  
  // 创建顶层 assembly Item
  private createAssemblyItem(component: ComponentData, singleItemId: string): EDMDItem;
  
  // 创建中间 single Item
  private createSingleItem(component: ComponentData, shapeIds: string[]): EDMDItem;
  
  // 创建底层形状元素
  private createShapeElements(component: ComponentData): any[];
  
  // 创建 ItemInstance
  private createItemInstance(
    singleItemId: string,
    transformation: EDMDTransformation2D,
    assembleToName: string
  ): any;
}
```

#### 5. 变换矩阵构建器（修改）

**职责**：
- 构建符合协议的变换矩阵 XML 结构
- 处理 2D 和 3D 变换
- 支持 Z 轴定位系统

```typescript
export class TransformationBuilder {
  // 构建 2D 变换（修正格式）
  build2DTransformation(
    parent: any,
    transformation: EDMDTransformation2D
  ): void;
  
  // 构建 3D 变换
  build3DTransformation(
    parent: any,
    transformation: EDMDTransformation3D
  ): void;
  
  // 从位置和旋转创建 2D 变换
  createTransformationFromPosition(
    x: number,
    y: number,
    rotation: number
  ): EDMDTransformation2D;
  
  // 添加 Z 偏移（IDX v4.5+）
  addZOffset(instanceElement: any, zOffset: number): void;
}
```

#### 6. 协议验证器（新增）

**职责**：
- 验证生成的 XML 是否符合 IDX V4.5 XSD Schema
- 提供详细的错误报告
- 支持可选的验证模式

```typescript
export class ProtocolValidator {
  // 验证 XML 字符串
  validate(xml: string): ValidationResult;
  
  // 验证特定元素
  validateElement(elementName: string, element: any): ValidationResult;
  
  // 加载 XSD Schema
  private loadSchema(version: '4.0' | '4.5'): any;
  
  // 生成验证报告
  generateReport(result: ValidationResult): string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  location: string;
  severity: 'error' | 'warning';
}
```

### 接口定义

#### 修改的类型定义

```typescript
// src/types/core/messages.ts

// 修正 ProcessInstruction 类型
export interface EDMDProcessInstructionSendInformation {
  instructionType: 'SendInformation';
  id: string;
  // 新增：Actor 和 Description（可选）
  Actor?: string;
  Description?: string;
}

export interface EDMDProcessInstructionSendChanges {
  instructionType: 'SendChanges';
  id: string;
  Actor?: string;
  Description?: string;
  // 新增：变更相关属性
  ChangeType?: 'Proposal' | 'Response';
  RelatedInstruction?: string;
}
```

```typescript
// src/types/core/items.ts

// 修正 Item 接口
export interface EDMDItem extends EDMDObject {
  ItemType: ItemType;
  
  // 修正：geometryType 应该是可选的，且值来自标准列表
  geometryType?: StandardGeometryType;
  
  // 新增：ReferenceName（用于被引用）
  ReferenceName?: EDMName;
  
  // 修正：AssembleToName 应该是字符串（引用 ReferenceName）
  AssembleToName?: string;
  
  // 修正：BaseLine 应该是布尔值，不是对象
  BaseLine?: boolean;
  
  // 其他现有属性...
  Identifier?: EDMDIdentifier;
  PackageName?: EDMName;
  Shape?: string | any;
  ItemInstances?: EDMDItemInstance[];
  UserProperties?: EDMDUserProperty[];
}

// 新增：标准几何类型枚举
export enum StandardGeometryType {
  BOARD_OUTLINE = 'BOARD_OUTLINE',
  COMPONENT = 'COMPONENT',
  HOLE_PLATED = 'HOLE_PLATED',
  HOLE_NON_PLATED = 'HOLE_NON_PLATED',
  FILLED_VIA = 'FILLED_VIA',
  KEEPOUT = 'KEEPOUT',
  LAYER_STACKUP = 'LAYER_STACKUP',
  LAYER = 'LAYER',
  // ... 其他标准类型
}

// 修正：ItemInstance 接口
export interface EDMDItemInstance extends EDMDObject {
  // Item 引用（字符串 ID，不是 href）
  Item: string;
  
  InstanceName: EDMName;
  
  // 变换矩阵
  Transformation?: EDMDTransformation;
  
  // 新增：Z 偏移（IDX v4.5+）
  zOffset?: number;
  
  // 新增：装配到的目标
  AssembleToName?: string;
}
```

```typescript
// src/types/core/common.ts

// 修正：用户属性接口
export interface EDMDUserProperty {
  // 使用正确的类型名称
  '@type': 'property:EDMDUserSimpleProperty';
  
  Key: EDMName;
  Value: string | number | boolean;
  IsChanged?: boolean;
  IsNew?: boolean;
  Persistent?: boolean;
  IsOriginator?: boolean;
}

// 修正：变换矩阵接口
export interface EDMDTransformation2D {
  // 不使用 xsi:type，而是使用 TransformationType 元素
  TransformationType: 'd2';
  
  // 旋转分量
  xx: number;
  xy: number;
  yx: number;
  yy: number;
  
  // 平移分量（使用 foundation:Value 包装）
  tx: { Value: number };
  ty: { Value: number };
  
  // 可选：Z 偏移
  zOffset?: { Value: number };
}
```

## Data Models

### 组件三层结构数据模型

```typescript
/**
 * 组件完整结构
 * 
 * 根据 IDX V4.5 协议第 71-77 页，组件需要三层结构：
 * 1. Assembly Item - 顶层容器
 * 2. Single Item - 中间定义
 * 3. Shape Elements - 底层几何
 */
export interface ComponentStructure {
  // 顶层：assembly Item
  assembly: {
    id: string;
    ItemType: 'assembly';
    geometryType: 'COMPONENT';
    Name: string;
    Identifier: EDMDIdentifier;
    AssembleToName: string;  // 引用层或板表面
    ItemInstances: [{
      id: string;
      Item: string;  // 引用 single Item 的 ID
      InstanceName: EDMName;
      Transformation: EDMDTransformation2D;
      zOffset?: number;
    }];
    BaseLine: boolean;
  };
  
  // 中间层：single Item
  single: {
    id: string;
    ItemType: 'single';
    Name: string;
    PackageName: EDMName;
    Shape: string;  // 引用形状 ID（不使用 href）
    UserProperties: EDMDUserProperty[];
    BaseLine: boolean;
  };
  
  // 底层：形状元素
  shapes: Array<{
    id: string;
    type: 'ShapeElement' | 'AssemblyComponent';
    ShapeElementType?: string;
    Inverted: boolean;
    DefiningShape: string;  // 引用 CurveSet2d 或其他几何
  }>;
}
```

### 层堆叠结构数据模型

```typescript
/**
 * 层堆叠结构
 * 
 * 根据 IDX V4.5 协议第 55-57 页
 */
export interface LayerStackupStructure {
  // 层堆叠 Item
  stackup: {
    id: string;
    ItemType: 'assembly';
    geometryType: 'LAYER_STACKUP';
    Name: string;
    ReferenceName: EDMName;  // 供其他元素引用
    ItemInstances: Array<{
      id: string;
      Item: string;  // 引用 Layer Item
      InstanceName: EDMName;
      UserProperties: Array<{
        Key: { SystemScope: string; ObjectName: string };
        Value: number;
      }>;  // UpperBound, LowerBound
    }>;
    BaseLine: boolean;
  };
  
  // 各个层 Item
  layers: Array<{
    id: string;
    ItemType: 'assembly';
    geometryType: 'LAYER';
    Name: string;
    ReferenceName: EDMName;
    UserProperties: EDMDUserProperty[];  // 层属性
    BaseLine: boolean;
  }>;
}
```

### Z 轴定位数据模型

```typescript
/**
 * Z 轴定位系统
 * 
 * IDX 使用相对定位而非绝对坐标
 */
export interface ZAxisPositioning {
  // 对象使用 2D 变换 + AssembleToName
  transformation: {
    TransformationType: 'd2';
    xx: number;
    xy: number;
    yx: number;
    yy: number;
    tx: { Value: number };
    ty: { Value: number };
    // 不包含 Z 分量
  };
  
  // 装配到的目标（层或表面的 ReferenceName）
  assembleToName: string;
  
  // 可选：Z 偏移（IDX v4.5+）
  zOffset?: number;
  
  // Z=0 定义为板底部的组件安装表面
  zeroReference: 'BOTTOM_SURFACE';
}
```

### 命名空间映射数据模型

```typescript
/**
 * XML 命名空间映射
 */
export interface NamespaceMapping {
  // 元素类型到命名空间的映射
  elementToNamespace: {
    // ProcessInstruction 类型
    'EDMDProcessInstructionSendInformation': 'computational',
    'EDMDProcessInstructionSendChanges': 'computational',
    'EDMDProcessInstructionRequestForInformation': 'computational',
    
    // 用户属性
    'UserProperty': 'foundation' | 'property',
    'EDMDUserSimpleProperty': 'property',
    
    // 几何元素
    'CartesianPoint': 'd2',
    'EDMDCartesianPoint': 'd2',
    'CurveSet2d': 'd2',
    'EDMDCurveSet2d': 'd2',
    
    // 变换
    'Transformation': 'pdm',
    'TransformationType': 'pdm',
    
    // 基础类型
    'Item': 'foundation',
    'EDMDItem': 'foundation',
    'Identifier': 'foundation',
    'EDMDIdentifier': 'foundation',
    
    // PDM 类型
    'ItemType': 'pdm',
    'ItemInstance': 'pdm',
    'Shape': 'pdm',
    'BaseLine': 'pdm',
    'AssembleToName': 'pdm',
  };
  
  // 属性到命名空间的映射
  attributeToNamespace: {
    'xsi:type': 'xsi',
    'geometryType': null,  // 无命名空间前缀
    'IsAttributeChanged': null,
  };
}
```

## Correctness Properties

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

在编写正确性属性之前，我需要先使用 prework 工具分析需求中的接受标准：


### Property Reflection

在编写属性之前，让我分析并消除冗余：

**识别的冗余**：
1. Property 1.1-1.3 可以合并为一个属性：对于所有消息类型，ProcessInstruction 的 xsi:type 应该使用 computational 命名空间
2. Property 4.2 和 4.4 部分重复：都检查不应该使用 href 属性
3. Property 10.2 和 10.4 完全重复：都检查 BaseLine 不应该使用 property:Value 包装
4. Property 5.3 被 Property 1.x 覆盖：ProcessInstruction 使用 computational 命名空间
5. Property 13.2 和 13.3 可以合并：2D 变换只包含指定的 6 个分量

**合并后的属性列表**：
- 合并 1.1-1.3 → Property 1: ProcessInstruction 命名空间正确性
- 保留 1.4 → Property 2: ProcessInstruction 不使用 foundation 命名空间
- 保留 2.1, 2.2, 2.4 → Properties 3-5: 几何类型正确性
- 保留 3.1-3.7 → Properties 6-12: 组件三层结构
- 合并 4.1-4.4 → Property 13: 形状引用格式
- 保留 5.1, 5.2, 5.4-5.7 → Properties 14-18: 命名空间使用
- 保留 6.1-6.4 → Properties 19-22: ItemType 使用
- 保留 7.1-7.4 → Properties 23-26: 变换矩阵格式
- 保留 8.1, 8.2 → Properties 27-28: CurveSet2d 命名
- 保留 9.1, 9.4 → Properties 29-30: ShapeDescriptionType
- 合并 10.1-10.4 → Property 31: BaseLine 格式
- 保留 11.2, 11.4 → Properties 32-33: 验证功能
- 合并 13.1-13.3 → Property 34: 2D 变换使用
- 保留 13.4, 13.5 → Properties 35-36: Z 轴定位
- 保留 14.1-14.5 → Properties 37-41: 层堆叠结构
- 保留 15.1, 15.2 → Properties 42-43: ShapeElement Inverted 属性

### Correctness Properties

#### Property 1: ProcessInstruction 使用正确的命名空间

*For any* IDX 消息（SendInformation、SendChanges 或 RequestForInformation），ProcessInstruction 元素的 xsi:type 属性应该使用 `computational` 命名空间前缀，格式为 `computational:EDMDProcessInstruction{MessageType}`

**Validates: Requirements 1.1, 1.2, 1.3**

#### Property 2: ProcessInstruction 不使用 foundation 命名空间

*For any* IDX 消息，ProcessInstruction 元素的 xsi:type 属性不应该以 `foundation:EDMD` 开头

**Validates: Requirements 1.4**

#### Property 3: 过孔使用标准几何类型

*For any* 使用简化表示的过孔对象，其 geometryType 属性应该是 `HOLE_PLATED` 或 `FILLED_VIA`，而不是 `VIA`

**Validates: Requirements 2.1**

#### Property 4: 非镀孔使用正确的几何类型

*For any* 非镀孔对象，其 geometryType 属性应该是 `HOLE_NON_PLATED`

**Validates: Requirements 2.2**

#### Property 5: 几何类型值的有效性

*For any* 包含 geometryType 属性的 Item，该属性的值应该在 IDX V4.5 协议表 8 定义的标准几何类型列表中

**Validates: Requirements 2.4**

#### Property 6: 组件具有三层结构

*For any* 组件，导出后的 XML 应该包含三个相关对象：一个 ItemType="assembly" 的顶层 Item、一个 ItemType="single" 的中间 Item 和至少一个形状对象

**Validates: Requirements 3.1**

#### Property 7: 组件顶层 Item 的属性

*For any* 组件的顶层 Item，应该具有 ItemType="assembly"、geometryType="COMPONENT"，并包含至少一个 ItemInstance 和 AssembleToName 属性

**Validates: Requirements 3.2**

#### Property 8: 组件顶层 Item 不直接引用形状

*For any* 组件的顶层 Item（ItemType="assembly"），不应该包含 Shape 元素或属性

**Validates: Requirements 3.3**

#### Property 9: 组件中间 Item 的属性

*For any* 组件的中间 Item，应该具有 ItemType="single"，并包含 PackageName、至少一个 UserProperty 和 Shape 引用

**Validates: Requirements 3.4**

#### Property 10: ItemInstance 引用中间 Item

*For any* 组件的 ItemInstance，其 Item 属性应该引用中间 single Item 的 ID

**Validates: Requirements 3.5**

#### Property 11: ItemInstance 包含变换矩阵

*For any* 组件的 ItemInstance，应该包含 Transformation 元素

**Validates: Requirements 3.6**

#### Property 12: 形状对象类型正确

*For any* 组件的形状对象，其 xsi:type 应该是 `EDMDAssemblyComponent` 或元素名称应该是 `ShapeElement`

**Validates: Requirements 3.7**

#### Property 13: 形状引用格式正确

*For any* Shape 元素，应该使用 `<pdm:Shape>SHAPE_ID</pdm:Shape>` 格式（元素文本内容），而不是 `<pdm:Shape href="#SHAPE_ID"/>` 格式（href 属性），且 ID 不应该包含 # 前缀

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

#### Property 14: 用户属性元素名称正确

*For any* 用户属性，其元素名称应该是 `foundation:UserProperty` 或 `property:UserProperty`，配合 `xsi:type="property:EDMDUserSimpleProperty"`，而不是 `property:UserSimpleProperty`

**Validates: Requirements 5.1, 5.2**

#### Property 15: 基础对象使用 foundation 命名空间

*For any* 基础对象类型（如 Item、Identifier、CartesianPoint 等），其 xsi:type 应该使用 `foundation` 命名空间前缀

**Validates: Requirements 5.4**

#### Property 16: 几何元素使用正确的命名空间

*For any* 几何元素（如 CartesianPoint、CurveSet2d 等），其 xsi:type 应该使用 `d2` 或 `d3` 命名空间前缀（根据维度）

**Validates: Requirements 5.5**

#### Property 17: PDM 元素使用 pdm 命名空间

*For any* PDM 相关元素（如 ItemType、Shape、BaseLine 等），应该使用 `pdm` 命名空间前缀

**Validates: Requirements 5.6**

#### Property 18: 用户属性子元素命名空间正确

*For any* 用户属性，其 Key 子元素应该使用 `foundation` 或 `property` 命名空间，Value 子元素应该使用 `property` 命名空间

**Validates: Requirements 5.7**

#### Property 19: 层堆叠使用正确的 ItemType

*For any* 层堆叠对象，应该使用 ItemType="assembly" 配合 geometryType="LAYER_STACKUP"

**Validates: Requirements 6.1**

#### Property 20: 层使用 assembly ItemType

*For any* 层对象，应该使用 ItemType="assembly" 而不是 ItemType="single"

**Validates: Requirements 6.2**

#### Property 21: 包含子项的对象使用 assembly

*For any* 包含 ItemInstance 的 Item，应该使用 ItemType="assembly"

**Validates: Requirements 6.3**

#### Property 22: 独立几何对象使用 single

*For any* 不包含 ItemInstance 的 Item（且不是层或层堆叠），应该使用 ItemType="single"

**Validates: Requirements 6.4**

#### Property 23: 2D 变换使用正确的结构

*For any* 2D 变换，应该包含 TransformationType 元素（值为 "d2"），以及 xx、xy、yx、yy、tx、ty 子元素，其中 tx 和 ty 应该使用 foundation:Value 包装数值

**Validates: Requirements 7.1**

#### Property 24: 2D 变换不使用 xsi:type 属性

*For any* Transformation 元素，不应该使用 `xsi:type="d2:EDMDTransformationD2"` 属性

**Validates: Requirements 7.2**

#### Property 25: TransformationType 值有效

*For any* Transformation 元素，其 TransformationType 子元素的值应该是 "d2" 或 "d3"

**Validates: Requirements 7.3**

#### Property 26: 平移分量使用 foundation:Value 包装

*For any* 变换矩阵的平移分量（tx、ty、tz），应该包含 foundation:Value 子元素来包装数值

**Validates: Requirements 7.4**

#### Property 27: CurveSet2d 使用统一的类型命名

*For any* 二维曲线集，其 xsi:type 应该是 `d2:EDMDCurveSet2d`（小写 d）

**Validates: Requirements 8.1**

#### Property 28: CurveSet2d 类型命名一致性

*For all* 二维曲线集，xsi:type 的命名应该一致，不应该混用 `EDMDCurveSet2D`（大写 D）和 `EDMDCurveSet2d`（小写 d）

**Validates: Requirements 8.2**

#### Property 29: 详细几何模型使用 GeometricModel

*For any* 详细几何模型，其 ShapeDescriptionType 应该是 `GeometricModel`

**Validates: Requirements 9.1**

#### Property 30: ShapeDescriptionType 值有效

*For any* ShapeDescriptionType 元素，其值应该符合 IDX V4.5 协议定义的标准值列表（如 GeometricModel、OUTLINE、SimplifiedModel 等）

**Validates: Requirements 9.4**

#### Property 31: BaseLine 使用正确的格式

*For any* BaseLine 元素，应该直接包含布尔值文本内容（"true" 或 "false"），而不是使用 property:Value 子元素包装

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

#### Property 32: 验证功能提供详细错误信息

*For any* 协议违规的 XML，验证功能应该返回包含违规位置和类型的详细错误信息

**Validates: Requirements 11.2**

#### Property 33: 验证报告包含所有问题

*For any* 包含多个协议违规的 XML，验证报告应该包含所有严重问题和警告，而不是只报告第一个问题

**Validates: Requirements 11.4**

#### Property 34: 组件使用 2D 变换和 AssembleToName

*For any* 组件，应该使用 2D 变换（TransformationType="d2"，只包含 xx、xy、yx、yy、tx、ty 分量）配合 AssembleToName，而不是 3D 变换（不包含 zx、zy、zz、tz 分量）

**Validates: Requirements 13.1, 13.2, 13.3**

#### Property 35: AssembleToName 引用有效

*For any* 包含 AssembleToName 的对象，该属性的值应该存在于某个层或板表面的 ReferenceName 中

**Validates: Requirements 13.4**

#### Property 36: Z 偏移使用 zOffset 属性

*For any* 需要 Z 偏移的 ItemInstance，应该使用 zOffset 属性而不是在变换矩阵中包含 Z 分量

**Validates: Requirements 13.5**

#### Property 37: 层堆叠类型正确

*For any* 层堆叠，应该创建 ItemType="assembly" 的 Item，配合 geometryType="LAYER_STACKUP"

**Validates: Requirements 14.1**

#### Property 38: 层堆叠包含有序的层实例

*For any* 层堆叠，应该包含每个层的 ItemInstance，且这些实例应该按从底部到顶部的顺序排列（通过 UserProperty 的 UpperBound 和 LowerBound 值判断）

**Validates: Requirements 14.2**

#### Property 39: 层实例引用 Layer Item

*For any* 层堆叠中的 ItemInstance，其 Item 属性应该引用一个 ItemType="assembly" 且 geometryType="LAYER" 的 Item

**Validates: Requirements 14.3**

#### Property 40: 层实例包含边界属性

*For any* 层堆叠中的 ItemInstance，应该包含 UserProperty 定义 UpperBound 和 LowerBound（如果在引用的 Layer Item 中未定义）

**Validates: Requirements 14.4**

#### Property 41: 层堆叠包含 ReferenceName

*For any* 层堆叠 Item，应该包含 ReferenceName 元素，供其他元素通过 AssembleToName 引用

**Validates: Requirements 14.5**

#### Property 42: 切割特征的 Inverted 为 true

*For any* 切割特征（孔、挖槽）的 ShapeElement，其 Inverted 属性应该设为 true

**Validates: Requirements 15.1**

#### Property 43: 实体特征的 Inverted 为 false

*For any* 实体特征（组件、板）的 ShapeElement，其 Inverted 属性应该设为 false

**Validates: Requirements 15.2**

## Error Handling

### 错误分类

导出器应该处理以下类型的错误：

**1. 输入数据错误**
- 缺少必需字段（如组件的 refDes、partNumber）
- 无效的数值（如负的直径、厚度）
- 引用不存在的对象（如 AssembleToName 引用不存在的层）

**处理策略**：
- 在导出前验证输入数据
- 抛出描述性异常，指明具体的错误字段和原因
- 提供数据验证工具函数

**2. 协议违规错误**
- 使用了无效的几何类型值
- 命名空间使用错误
- XML 结构不符合 XSD Schema

**处理策略**：
- 在序列化过程中进行检查
- 如果启用了验证，在生成 XML 后进行 XSD 验证
- 记录详细的错误信息，包括违规位置和类型
- 提供修复建议

**3. 内部错误**
- ID 生成冲突
- 引用关系循环
- 内存不足

**处理策略**：
- 使用唯一的 ID 生成策略（如 UUID 或带计数器的前缀）
- 在构建引用关系时检测循环
- 对大型数据集使用流式处理

### 错误报告格式

```typescript
export interface ExportError {
  code: string;           // 错误代码（如 'INVALID_GEOMETRY_TYPE'）
  message: string;        // 人类可读的错误消息
  severity: 'error' | 'warning' | 'info';
  location?: {
    objectType: string;   // 对象类型（如 'Component', 'Via'）
    objectId: string;     // 对象 ID
    field?: string;       // 具体字段
  };
  suggestion?: string;    // 修复建议
}
```

### 错误恢复策略

**可恢复的错误**（生成警告但继续导出）：
- 缺少可选属性
- 使用了非标准但有效的值
- 性能优化建议

**不可恢复的错误**（中止导出）：
- 缺少必需字段
- 数据类型不匹配
- 引用完整性破坏

## Testing Strategy

### 测试方法

采用**双重测试策略**：

**1. 单元测试**
- 测试特定的 XML 构建方法
- 测试数据验证函数
- 测试错误处理逻辑
- 测试边界情况和错误条件

**2. 属性测试（Property-Based Testing）**
- 验证通用的正确性属性
- 使用随机生成的输入数据
- 每个属性测试至少运行 100 次迭代
- 覆盖各种输入组合

### 测试配置

**属性测试库**：使用 `fast-check`（TypeScript/JavaScript 的属性测试库）

**最小迭代次数**：100 次（由于随机化）

**标签格式**：每个属性测试必须包含注释，引用设计文档中的属性

```typescript
// Feature: idx-protocol-compliance-fixes, Property 1: ProcessInstruction 使用正确的命名空间
test('ProcessInstruction uses computational namespace', () => {
  fc.assert(
    fc.property(
      messageTypeArbitrary(),
      (messageType) => {
        const dataset = createDataset(messageType);
        const xml = exporter.export(dataset);
        const parsed = parseXML(xml);
        const instruction = parsed.ProcessInstruction;
        
        expect(instruction['@xsi:type']).toMatch(/^computational:EDMDProcessInstruction/);
      }
    ),
    { numRuns: 100 }
  );
});
```

### 测试覆盖范围

**P0 - 严重问题（必须测试）**：
- Property 1-2: ProcessInstruction 命名空间
- Property 13: 形状引用格式
- Property 14-18: 命名空间使用

**P1 - 重要问题（强烈建议测试）**：
- Property 3-5: 几何类型
- Property 6-12: 组件结构
- Property 23-26: 变换矩阵格式

**P2 - 优化问题（建议测试）**：
- Property 19-22: ItemType 使用
- Property 27-30: CurveSet2d 和 ShapeDescriptionType
- Property 31: BaseLine 格式

**P3 - 增强功能（可选测试）**：
- Property 34-36: Z 轴定位
- Property 37-41: 层堆叠结构
- Property 42-43: ShapeElement 布尔运算

### 单元测试示例

```typescript
describe('XMLWriter - ProcessInstruction', () => {
  it('should use computational namespace for SendInformation', () => {
    const instruction: EDMDProcessInstructionSendInformation = {
      instructionType: 'SendInformation',
      id: 'INSTRUCTION_001'
    };
    
    const dataset = createTestDataset(instruction);
    const xml = writer.serialize(dataset);
    
    expect(xml).toContain('xsi:type="computational:EDMDProcessInstructionSendInformation"');
    expect(xml).not.toContain('foundation:EDMDSendInformation');
  });
  
  it('should format Shape reference without href', () => {
    const item: EDMDItem = {
      id: 'ITEM_001',
      ItemType: ItemType.SINGLE,
      Shape: 'SHAPE_001'
    };
    
    const xml = writer.buildItem(createMockParent(), item);
    
    expect(xml).toContain('<pdm:Shape>SHAPE_001</pdm:Shape>');
    expect(xml).not.toContain('href');
    expect(xml).not.toContain('#SHAPE_001');
  });
});
```

### 集成测试

**测试场景**：
1. 导出简单的单层板
2. 导出包含组件的多层板
3. 导出包含过孔和孔的板
4. 导出包含层堆叠的板
5. 导出包含禁止区的板

**验证方法**：
1. 生成 IDX 文件
2. 使用 XSD Schema 验证 XML 结构
3. 解析 XML 并验证关键属性
4. 与参考 IDX 文件对比（如果有）

### 回归测试

**策略**：
- 保留所有现有测试用例
- 更新预期输出以反映修复后的格式
- 确保所有测试通过
- 添加新的测试用例覆盖修复的问题

**测试数据**：
- 使用现有的示例文件（如 examples/export-with-layers.ts）
- 创建新的测试数据覆盖边界情况
- 使用真实的 PCB 设计数据（如果可用）

### 性能测试

**测试目标**：
- 验证修复不会显著降低导出性能
- 验证验证功能的性能开销可接受

**测试方法**：
- 测量导出大型设计的时间（如 1000+ 组件）
- 比较修复前后的性能
- 测量启用/禁用验证的性能差异

**性能目标**：
- 导出性能下降不超过 10%
- 验证功能的开销不超过 20%
