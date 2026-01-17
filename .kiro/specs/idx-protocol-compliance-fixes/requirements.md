# Requirements Document

## Introduction

本需求文档定义了 IDX 导出器协议合规性修复的功能需求。当前的 IDX 导出器在生成 IDX V4.5 格式文件时存在多个不符合协议规范的问题，这些问题可能导致生成的文件无法被其他 IDX 兼容系统正确解析和处理。本需求旨在修复所有已识别的协议违规问题，确保导出器生成完全符合 IDX V4.5 规范的文件。

## Glossary

- **IDX_Exporter**: IDX 导出器，负责将 PCB 设计数据转换为 IDX V4.5 格式文件的软件组件
- **XML_Writer**: XML 写入器，IDX 导出器中负责将数据结构序列化为 XML 格式的模块
- **ProcessInstruction**: 过程指令，IDX 消息中定义消息类型和处理方式的元素
- **Item**: IDX 协议中的项目元素，表示设计中的物理或逻辑对象
- **Shape**: 形状元素，定义 Item 的几何表示
- **Namespace**: XML 命名空间，用于区分不同来源的 XML 元素和属性
- **GeometryType**: 几何类型属性，IDX V4.5 中用于简化几何表示的属性
- **Transformation**: 变换矩阵，定义对象在空间中的位置、旋转和缩放
- **Component**: 组件，PCB 上的电子元器件
- **Via**: 过孔，连接不同层的导电孔
- **ItemInstance**: 项目实例，表示 Item 在装配体中的具体实例
- **CurveSet2d**: 二维曲线集，用于定义复杂的二维几何形状
- **UserProperty**: 用户属性，用于存储自定义的键值对数据

## Requirements

### Requirement 1: 修复 ProcessInstruction 类型声明

**User Story:** 作为 IDX 文件的接收系统，我需要正确识别消息类型，以便正确处理接收到的数据。

#### Acceptance Criteria

1. WHEN 生成 SendInformation 消息时，THE IDX_Exporter SHALL 使用 `xsi:type="computational:EDMDProcessInstructionSendInformation"` 作为 ProcessInstruction 的类型声明
2. WHEN 生成 SendChanges 消息时，THE IDX_Exporter SHALL 使用 `xsi:type="computational:EDMDProcessInstructionSendChanges"` 作为 ProcessInstruction 的类型声明
3. WHEN 生成 RequestForInformation 消息时，THE IDX_Exporter SHALL 使用 `xsi:type="computational:EDMDProcessInstructionRequestForInformation"` 作为 ProcessInstruction 的类型声明
4. THE IDX_Exporter SHALL NOT 使用 `foundation:EDMD*` 命名空间前缀作为 ProcessInstruction 的类型

### Requirement 2: 修复几何类型使用

**User Story:** 作为 IDX 文件解析器，我需要识别标准的几何类型，以便正确渲染和处理几何对象。

#### Acceptance Criteria

1. WHEN 使用简化表示过孔时，THE IDX_Exporter SHALL 使用 `geometryType="HOLE_PLATED"` 或 `geometryType="FILLED_VIA"` 而不是 `geometryType="VIA"`
2. WHEN 表示非镀孔时，THE IDX_Exporter SHALL 使用 `geometryType="HOLE_NON_PLATED"`
3. WHEN 需要区分信号孔和过孔时，THE IDX_Exporter SHALL 使用传统方法（InterStratumFeature 对象，InterStratumFeatureType="Via"）
4. THE IDX_Exporter SHALL 仅使用 IDX V4.5 协议表 8 中定义的标准几何类型值
5. WHEN geometryType 不适用时，THE IDX_Exporter SHALL 省略 geometryType 属性并使用完整的几何定义

### Requirement 3: 完善组件结构

**User Story:** 作为 MCAD 系统，我需要完整的组件定义（包括几何和实例信息），以便正确显示和操作组件。

#### Acceptance Criteria

1. WHEN 导出组件时，THE IDX_Exporter SHALL 创建三层结构：顶层 assembly Item、中间 single Item 和底层形状对象
2. THE 顶层 Item SHALL 使用 `ItemType="assembly"` 和 `geometryType="COMPONENT"`，包含 ItemInstance 和 AssembleToName
3. THE 顶层 Item SHALL NOT 直接引用形状
4. THE 中间 Item SHALL 使用 `ItemType="single"`，定义组件本体，包含 PackageName、用户属性和形状引用
5. THE ItemInstance SHALL 引用中间 single Item
6. THE ItemInstance SHALL 包含变换矩阵，定义组件在板上的位置和旋转
7. THE 底层形状对象 SHALL 使用 EDMDAssemblyComponent 或 ShapeElement 定义实际几何

### Requirement 4: 修复形状引用格式

**User Story:** 作为 IDX 文件验证器，我需要正确的 XML 元素格式，以便通过 XSD Schema 验证。

#### Acceptance Criteria

1. WHEN 引用形状时，THE IDX_Exporter SHALL 使用 `<pdm:Shape>SHAPE_ID</pdm:Shape>` 格式
2. THE IDX_Exporter SHALL NOT 使用 `<pdm:Shape href="#SHAPE_ID"/>` 格式
3. THE 形状引用 SHALL 包含目标形状的 ID 作为元素文本内容
4. THE 形状引用 SHALL NOT 使用 href 属性或 # 前缀

### Requirement 5: 规范命名空间使用

**User Story:** 作为 IDX 协议实现者，我需要正确的命名空间使用，以便与其他 IDX 系统互操作。

#### Acceptance Criteria

1. WHEN 定义用户属性时，THE IDX_Exporter SHALL 使用 `foundation:UserProperty` 或 `property:UserProperty` 元素名称，配合 `xsi:type="property:EDMDUserSimpleProperty"` 类型声明
2. THE IDX_Exporter SHALL NOT 使用 `property:UserSimpleProperty` 作为元素名称
3. THE ProcessInstruction 元素 SHALL 使用 `computational` 命名空间的类型
4. THE 基础对象类型 SHALL 使用 `foundation` 命名空间
5. THE 几何元素 SHALL 使用 `d2` 或 `d3` 命名空间（根据维度）
6. THE PDM 相关元素 SHALL 使用 `pdm` 命名空间
7. THE 用户属性的 Key 和 Value 子元素 SHALL 使用正确的命名空间前缀

### Requirement 6: 修正 ItemType 使用

**User Story:** 作为 IDX 数据消费者，我需要正确的 ItemType 分类，以便理解对象的层次结构和用途。

#### Acceptance Criteria

1. WHEN 定义层叠结构时，THE IDX_Exporter SHALL 使用 `ItemType="assembly"` 配合 `geometryType="LAYER_STACKUP"`
2. WHEN 定义单个层时，THE IDX_Exporter SHALL 使用 `ItemType="assembly"` 而不是 `ItemType="single"`
3. WHEN 定义包含子项的对象时，THE IDX_Exporter SHALL 使用 `ItemType="assembly"`
4. WHEN 定义独立的几何对象时，THE IDX_Exporter SHALL 使用 `ItemType="single"`
5. THE 层定义 SHALL 遵循协议第 53-54 页的示例格式

### Requirement 7: 修复变换矩阵格式

**User Story:** 作为 3D 渲染引擎，我需要标准格式的变换矩阵，以便正确计算对象的空间位置。

#### Acceptance Criteria

1. WHEN 定义 2D 变换时，THE IDX_Exporter SHALL 使用以下结构：
   ```xml
   <pdm:Transformation>
     <pdm:TransformationType>d2</pdm:TransformationType>
     <pdm:xx>value</pdm:xx>
     <pdm:xy>value</pdm:xy>
     <pdm:yx>value</pdm:yx>
     <pdm:yy>value</pdm:yy>
     <pdm:tx><foundation:Value>value</foundation:Value></pdm:tx>
     <pdm:ty><foundation:Value>value</foundation:Value></pdm:ty>
   </pdm:Transformation>
   ```
2. THE IDX_Exporter SHALL NOT 使用 `xsi:type="d2:EDMDTransformationD2"` 属性
3. THE TransformationType 元素 SHALL 包含值 "d2" 或 "d3"
4. THE 平移分量（tx, ty, tz）SHALL 使用 `foundation:Value` 子元素包装数值

### Requirement 8: 统一 CurveSet2d 类型命名

**User Story:** 作为 XML 解析器，我需要一致的类型命名，以便正确识别和处理元素。

#### Acceptance Criteria

1. WHEN 定义二维曲线集时，THE IDX_Exporter SHALL 统一使用 `d2:EDMDCurveSet2d` 类型（小写 d）
2. THE IDX_Exporter SHALL NOT 混用 `EDMDCurveSet2D`（大写 D）和 `EDMDCurveSet2d`（小写 d）
3. THE 类型命名 SHALL 遵循 IDX V4.5 XSD Schema 中的定义

### Requirement 9: 修正 ShapeDescriptionType 值

**User Story:** 作为几何处理系统，我需要正确的形状描述类型，以便选择适当的渲染方法。

#### Acceptance Criteria

1. WHEN 定义详细几何模型时，THE IDX_Exporter SHALL 使用 `ShapeDescriptionType="GeometricModel"`
2. WHEN 定义简单 2.5D 轮廓时，THE IDX_Exporter SHALL 可以使用 `ShapeDescriptionType="OUTLINE"`
3. THE IDX_Exporter SHALL 根据几何的复杂度和精度要求选择适当的 ShapeDescriptionType
4. THE ShapeDescriptionType 值 SHALL 符合 IDX V4.5 协议第 116 页的定义
5. WHEN 使用精确的 Z 边界时，THE IDX_Exporter SHALL 优先使用 `GeometricModel`

### Requirement 10: 规范基线和属性格式

**User Story:** 作为版本控制系统，我需要标准格式的基线标记，以便跟踪设计版本。

#### Acceptance Criteria

1. WHEN 标记基线时，THE IDX_Exporter SHALL 使用 `<pdm:BaseLine>true</pdm:BaseLine>` 格式
2. THE IDX_Exporter SHALL NOT 使用 `<pdm:Baseline><property:Value>true</property:Value></pdm:Baseline>` 格式
3. THE BaseLine 元素 SHALL 直接包含布尔值文本内容
4. THE BaseLine 元素 SHALL NOT 使用 property:Value 子元素包装

### Requirement 11: 协议验证

**User Story:** 作为质量保证工程师，我需要验证生成的 IDX 文件符合协议规范，以便确保互操作性。

#### Acceptance Criteria

1. THE IDX_Exporter SHALL 提供验证功能，检查生成的 XML 是否符合 IDX V4.5 XSD Schema
2. WHEN 检测到协议违规时，THE IDX_Exporter SHALL 记录详细的错误信息，包括违规位置和类型
3. THE 验证功能 SHALL 支持可选启用，不影响导出性能
4. THE 验证报告 SHALL 包含所有严重问题和警告

### Requirement 12: 向后兼容性

**User Story:** 作为现有用户，我需要修复后的导出器仍然支持现有功能，以便无缝升级。

#### Acceptance Criteria

1. WHEN 修复协议问题后，THE IDX_Exporter SHALL 保持所有现有的公共 API 接口不变
2. THE 现有测试用例 SHALL 继续通过（在更新预期输出后）
3. THE 导出器 SHALL 支持相同的输入数据格式
4. THE 修复 SHALL NOT 破坏现有的导出功能

### Requirement 13: 正确实现 Z 轴定位系统

**User Story:** 作为 3D CAD 系统，我需要知道对象相对于哪个表面放置，以便在板厚度变化时自动调整位置。

#### Acceptance Criteria

1. WHEN 定义组件位置时，THE IDX_Exporter SHALL 使用 2D 变换配合 AssembleToName，而不是 3D 变换
2. THE 变换矩阵 SHALL 只包含 xx, xy, yx, yy, tx, ty 分量
3. THE 变换矩阵 SHALL NOT 包含 zx, zy, zz, tz 分量（除非使用完整 3D 变换）
4. THE AssembleToName SHALL 引用一个层或板表面的 ReferenceName
5. WHEN 需要 Z 偏移时，THE IDX_Exporter SHALL 使用 ItemInstance 的 zOffset 属性（IDX v4.5+）
6. THE Z=0 SHALL 定义为板底部的组件安装表面

### Requirement 14: 正确表示层堆叠结构

**User Story:** 作为层叠分析工具，我需要正确的层顺序和厚度信息，以便进行阻抗计算和热分析。

#### Acceptance Criteria

1. WHEN 定义层堆叠时，THE IDX_Exporter SHALL 创建 `ItemType="assembly"` 的 Item，配合 `geometryType="LAYER_STACKUP"`
2. THE 层堆叠 Item SHALL 包含每个层的 ItemInstance，按从底部到顶部的顺序排列
3. EACH 层实例 SHALL 通过 Item 属性引用一个 Layer Item
4. THE 层实例 SHALL 包含 UserProperty 定义 UpperBound 和 LowerBound（如果在 Layer Item 中未定义）
5. THE 层堆叠 Item SHALL 包含 ReferenceName 属性，供其他元素引用
6. THE 层堆叠结构 SHALL 遵循协议第 55-57 页的示例格式

### Requirement 15: 正确使用 ShapeElement 布尔运算

**User Story:** 作为几何建模系统，我需要知道哪些形状是添加的，哪些是减去的，以便正确构建 3D 模型。

#### Acceptance Criteria

1. WHEN 定义切割特征（孔、挖槽）时，THE ShapeElement 的 Inverted 属性 SHALL 设为 true
2. WHEN 定义实体特征（组件、板）时，THE ShapeElement 的 Inverted 属性 SHALL 设为 false
3. WHEN 多个 ShapeElement 组合时，THE 顺序 SHALL 反映布尔运算的顺序
4. THE Inverted 属性 SHALL 正确反映 CSG（构造实体几何）操作
5. THE 布尔运算 SHALL 遵循先加后减的原则
