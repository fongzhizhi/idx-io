# Implementation Plan: IDX Protocol Compliance Fixes

## Overview

本实现计划将 IDX 导出器的协议合规性修复分解为可执行的编码任务。修复工作采用分阶段策略，优先处理严重的结构性问题，然后完善功能性问题，最后添加验证和测试机制。

实现语言：**TypeScript**

测试框架：**Jest** + **fast-check**（属性测试）

## Tasks

- [x] 1. 阶段 1：XML 结构修复（P0 - 严重问题）
  - [x] 1.1 修复 ProcessInstruction 类型声明
    - 修改 `src/exporter/writers/xml-writer.ts` 中的 `buildProcessInstruction` 方法
    - 将 `xsi:type` 从 `foundation:EDMD{type}` 改为 `computational:EDMDProcessInstruction{type}`
    - 支持 SendInformation、SendChanges 和 RequestForInformation 三种消息类型
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 1.2 编写 ProcessInstruction 命名空间的属性测试
    - **Property 1: ProcessInstruction 使用正确的命名空间**
    - **Property 2: ProcessInstruction 不使用 foundation 命名空间**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  
  - [x] 1.3 修复形状引用格式
    - 修改 `buildItem` 方法中的 Shape 引用构建逻辑
    - 将 `<pdm:Shape href="#SHAPE_ID"/>` 改为 `<pdm:Shape>SHAPE_ID</pdm:Shape>`
    - 移除 href 属性和 # 前缀
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 1.4 编写形状引用格式的属性测试
    - **Property 13: 形状引用格式正确**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  
  - [x] 1.5 创建命名空间管理器
    - 创建 `src/exporter/utils/namespace-manager.ts` 文件
    - 实现 `NamespaceManager` 类，集中管理所有 XML 命名空间
    - 提供类型到命名空间的映射方法
    - 提供命名空间验证方法
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 1.6 规范用户属性的命名空间使用
    - 修改 `buildUserProperty` 方法
    - 将元素名称从 `property:UserSimpleProperty` 改为 `foundation:UserProperty` 或 `property:UserProperty`
    - 使用 `xsi:type="property:EDMDUserSimpleProperty"`
    - 确保 Key 和 Value 子元素使用正确的命名空间
    - _Requirements: 5.1, 5.2, 5.7_
  
  - [ ]* 1.7 编写命名空间使用的属性测试
    - **Property 14: 用户属性元素名称正确**
    - **Property 15: 基础对象使用 foundation 命名空间**
    - **Property 16: 几何元素使用正确的命名空间**
    - **Property 17: PDM 元素使用 pdm 命名空间**
    - **Property 18: 用户属性子元素命名空间正确**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6, 5.7**

- [ ] 2. 检查点 - 确保阶段 1 测试通过
  - 运行所有测试：`npm test`
  - 验证生成的 IDX 文件的 ProcessInstruction、形状引用和命名空间是否正确
  - 如有问题，请向用户报告

- [-] 3. 阶段 2：几何和组件修复（P1 - 重要问题）
  - [x] 3.1 创建几何类型映射器
    - 创建 `src/exporter/utils/geometry-type-mapper.ts` 文件
    - 实现 `GeometryTypeMapper` 类
    - 定义标准几何类型枚举（来自协议表 8）
    - 实现内部类型到 IDX 类型的映射方法
    - 实现几何类型验证方法
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 3.2 修复几何类型使用
    - 修改 `buildItem` 方法，使用 `GeometryTypeMapper` 映射几何类型
    - 将过孔的 `geometryType="VIA"` 改为 `geometryType="HOLE_PLATED"` 或 `geometryType="FILLED_VIA"`
    - 确保非镀孔使用 `geometryType="HOLE_NON_PLATED"`
    - 验证所有几何类型值在标准列表中
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [ ]* 3.3 编写几何类型的属性测试
    - **Property 3: 过孔使用标准几何类型**
    - **Property 4: 非镀孔使用正确的几何类型**
    - **Property 5: 几何类型值的有效性**
    - **Validates: Requirements 2.1, 2.2, 2.4**
  
  - [x] 3.4 创建组件结构构建器
    - 创建 `src/exporter/builders/component-structure-builder.ts` 文件
    - 实现 `ComponentStructureBuilder` 类
    - 实现 `buildComponentStructure` 方法，构建三层结构
    - 实现 `createAssemblyItem` 方法，创建顶层 assembly Item
    - 实现 `createSingleItem` 方法，创建中间 single Item
    - 实现 `createShapeElements` 方法，创建底层形状元素
    - 实现 `createItemInstance` 方法，创建 ItemInstance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 3.5 修改 XMLWriter 以使用组件结构构建器
    - 在 `XMLWriter` 中集成 `ComponentStructureBuilder`
    - 修改组件导出逻辑，使用三层结构
    - 确保顶层 Item 不直接引用形状
    - 确保 ItemInstance 引用中间 single Item
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 3.6 编写组件结构的属性测试
    - **Property 6: 组件具有三层结构**
    - **Property 7: 组件顶层 Item 的属性**
    - **Property 8: 组件顶层 Item 不直接引用形状**
    - **Property 9: 组件中间 Item 的属性**
    - **Property 10: ItemInstance 引用中间 Item**
    - **Property 11: ItemInstance 包含变换矩阵**
    - **Property 12: 形状对象类型正确**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
  
  - [x] 3.7 创建变换矩阵构建器
    - 创建 `src/exporter/builders/transformation-builder.ts` 文件
    - 实现 `TransformationBuilder` 类
    - 实现 `build2DTransformation` 方法，使用正确的 XML 结构
    - 实现 `build3DTransformation` 方法
    - 实现 `createTransformationFromPosition` 方法
    - 实现 `addZOffset` 方法（IDX v4.5+）
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 3.8 修复变换矩阵格式
    - 修改 `buildTransformation` 方法，使用 `TransformationBuilder`
    - 移除 `xsi:type="d2:EDMDTransformationD2"` 属性
    - 添加 `TransformationType` 元素
    - 使用 `foundation:Value` 包装 tx、ty、tz 的数值
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 3.9 编写变换矩阵格式的属性测试
    - **Property 23: 2D 变换使用正确的结构**
    - **Property 24: 2D 变换不使用 xsi:type 属性**
    - **Property 25: TransformationType 值有效**
    - **Property 26: 平移分量使用 foundation:Value 包装**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 4. 检查点 - 确保阶段 2 测试通过
  - 运行所有测试：`npm test`
  - 验证生成的 IDX 文件的几何类型、组件结构和变换矩阵是否正确
  - 如有问题，请向用户报告

- [ ] 5. 阶段 3：类型和属性修复（P2 - 优化问题）
  - [x] 5.1 修正 ItemType 使用
    - 修改 `buildItem` 方法，根据对象类型选择正确的 ItemType
    - 层叠结构使用 `ItemType="assembly"` 配合 `geometryType="LAYER_STACKUP"`
    - 单个层使用 `ItemType="assembly"` 配合 `geometryType="LAYER"`
    - 包含子项的对象使用 `ItemType="assembly"`
    - 独立几何对象使用 `ItemType="single"`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 5.2 编写 ItemType 使用的属性测试
    - **Property 19: 层堆叠使用正确的 ItemType**
    - **Property 20: 层使用 assembly ItemType**
    - **Property 21: 包含子项的对象使用 assembly**
    - **Property 22: 独立几何对象使用 single**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  
  - [x] 5.3 统一 CurveSet2d 类型命名
    - 修改 `buildCurveSet2D` 方法
    - 确保所有 CurveSet2d 使用 `d2:EDMDCurveSet2d`（小写 d）
    - 移除任何 `EDMDCurveSet2D`（大写 D）的使用
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 5.4 编写 CurveSet2d 命名的属性测试
    - **Property 27: CurveSet2d 使用统一的类型命名**
    - **Property 28: CurveSet2d 类型命名一致性**
    - **Validates: Requirements 8.1, 8.2**
  
  - [x] 5.5 修正 ShapeDescriptionType 值
    - 修改 `buildCurveSet2D` 和相关方法
    - 详细几何模型使用 `ShapeDescriptionType="GeometricModel"`
    - 简单 2.5D 轮廓可以使用 `ShapeDescriptionType="OUTLINE"`
    - 验证 ShapeDescriptionType 值在标准列表中
    - _Requirements: 9.1, 9.4_
  
  - [ ]* 5.6 编写 ShapeDescriptionType 的属性测试
    - **Property 29: 详细几何模型使用 GeometricModel**
    - **Property 30: ShapeDescriptionType 值有效**
    - **Validates: Requirements 9.1, 9.4**
  
  - [x] 5.7 规范基线和属性格式
    - 修改 `buildItem` 方法中的 BaseLine 构建逻辑
    - 将 `<pdm:Baseline><property:Value>true</property:Value></pdm:Baseline>` 改为 `<pdm:BaseLine>true</pdm:BaseLine>`
    - 确保 BaseLine 元素直接包含布尔值文本内容
    - 注意大小写：BaseLine（不是 Baseline）
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 5.8 编写 BaseLine 格式的属性测试
    - **Property 31: BaseLine 使用正确的格式**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [x] 6. 检查点 - 确保阶段 3 测试通过
  - 运行所有测试：`npm test`
  - 验证生成的 IDX 文件的 ItemType、CurveSet2d、ShapeDescriptionType 和 BaseLine 是否正确
  - 如有问题，请向用户报告

- [ ] 7. 阶段 4：高级功能增强（P3 - 可选）
  - [x] 7.1 实现 Z 轴定位系统
    - 修改组件导出逻辑，使用 2D 变换配合 AssembleToName
    - 确保 2D 变换只包含 xx、xy、yx、yy、tx、ty 分量
    - 添加 AssembleToName 属性，引用层或板表面的 ReferenceName
    - 实现 zOffset 属性支持（IDX v4.5+）
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ]* 7.2 编写 Z 轴定位的属性测试
    - **Property 34: 组件使用 2D 变换和 AssembleToName**
    - **Property 35: AssembleToName 引用有效**
    - **Property 36: Z 偏移使用 zOffset 属性**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**
  
  - [x] 7.3 创建层堆叠结构构建器
    - 创建 `src/exporter/builders/layer-stackup-builder.ts` 文件
    - 实现 `LayerStackupBuilder` 类
    - 实现 `buildLayerStackup` 方法，构建层堆叠结构
    - 实现层实例的创建和排序逻辑
    - 添加 UpperBound 和 LowerBound 属性
    - 添加 ReferenceName 属性
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 7.4 完善层堆叠结构
    - 修改 `buildItem` 方法，使用 `LayerStackupBuilder`
    - 确保层堆叠使用 `ItemType="assembly"` 和 `geometryType="LAYER_STACKUP"`
    - 确保层使用 `ItemType="assembly"` 和 `geometryType="LAYER"`
    - 确保层实例按从底部到顶部的顺序排列
    - 确保层实例引用 Layer Item
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ]* 7.5 编写层堆叠结构的属性测试
    - **Property 37: 层堆叠类型正确**
    - **Property 38: 层堆叠包含有序的层实例**
    - **Property 39: 层实例引用 Layer Item**
    - **Property 40: 层实例包含边界属性**
    - **Property 41: 层堆叠包含 ReferenceName**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**
  
  - [x] 7.6 实现 ShapeElement 布尔运算
    - 修改 `buildShapeElement` 方法
    - 切割特征（孔、挖槽）的 Inverted 属性设为 true
    - 实体特征（组件、板）的 Inverted 属性设为 false
    - 确保 ShapeElement 的顺序反映布尔运算顺序
    - _Requirements: 15.1, 15.2_
  
  - [ ]* 7.7 编写 ShapeElement 布尔运算的属性测试
    - **Property 42: 切割特征的 Inverted 为 true**
    - **Property 43: 实体特征的 Inverted 为 false**
    - **Validates: Requirements 15.1, 15.2**

- [x] 8. 检查点 - 确保阶段 4 测试通过
  - 运行所有测试：`npm test`
  - 验证生成的 IDX 文件的 Z 轴定位、层堆叠结构和 ShapeElement 是否正确
  - 如有问题，请向用户报告

- [ ] 9. 协议验证功能
  - [~] 9.1 创建协议验证器
    - 创建 `src/exporter/validators/protocol-validator.ts` 文件
    - 实现 `ProtocolValidator` 类
    - 实现 `validate` 方法，使用 XSD Schema 验证 XML
    - 实现 `validateElement` 方法，验证特定元素
    - 实现 `loadSchema` 方法，加载 IDX V4.5 XSD Schema
    - 实现 `generateReport` 方法，生成验证报告
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [~] 9.2 集成验证功能到 XMLWriter
    - 在 `XMLWriter` 中添加 `validationEnabled` 选项
    - 在 `serialize` 方法中添加可选的验证步骤
    - 如果验证失败，记录详细的错误信息
    - 确保验证是可选的，不影响导出性能
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 9.3 编写验证功能的单元测试
    - 测试验证功能的存在和基本功能
    - 测试错误报告的详细性
    - 测试可选启用的配置
    - 测试验证报告的完整性
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 9.4 编写验证功能的属性测试
    - **Property 32: 验证功能提供详细错误信息**
    - **Property 33: 验证报告包含所有问题**
    - **Validates: Requirements 11.2, 11.4**

- [ ] 10. 类型定义更新
  - [~] 10.1 更新 ProcessInstruction 类型定义
    - 修改 `src/types/core/messages.ts`
    - 添加 Actor 和 Description 属性到 ProcessInstruction 接口
    - 添加 ChangeType 和 RelatedInstruction 到 SendChanges 接口
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [~] 10.2 更新 Item 类型定义
    - 修改 `src/types/core/items.ts`
    - 将 geometryType 改为可选的 StandardGeometryType 枚举
    - 添加 ReferenceName 属性
    - 修正 AssembleToName 为字符串类型
    - 修正 BaseLine 为布尔类型
    - _Requirements: 2.4, 6.1, 6.2, 10.1, 13.4, 14.5_
  
  - [~] 10.3 创建 StandardGeometryType 枚举
    - 在 `src/types/core/items.ts` 中添加 StandardGeometryType 枚举
    - 包含所有 IDX V4.5 协议表 8 定义的标准几何类型
    - _Requirements: 2.4_
  
  - [~] 10.4 更新 ItemInstance 类型定义
    - 修改 `src/types/core/items.ts`
    - 将 Item 改为字符串类型（ID 引用）
    - 添加 zOffset 属性
    - 添加 AssembleToName 属性
    - _Requirements: 3.5, 13.5_
  
  - [~] 10.5 更新 UserProperty 类型定义
    - 修改 `src/types/core/common.ts`
    - 使用正确的类型名称 `property:EDMDUserSimpleProperty`
    - _Requirements: 5.1_
  
  - [~] 10.6 更新 Transformation 类型定义
    - 修改 `src/types/core/common.ts`
    - 移除 xsi:type，添加 TransformationType 元素
    - 修改 tx、ty、tz 为 `{ Value: number }` 格式
    - _Requirements: 7.1, 7.3, 7.4_

- [ ] 11. 文档和示例更新
  - [~] 11.1 更新 README.md
    - 添加协议合规性修复的说明
    - 更新使用示例，反映新的 API（如果有变化）
    - 添加验证功能的使用说明
    - _Requirements: 12.1_
  
  - [~] 11.2 更新示例文件
    - 更新 `examples/export-with-layers.ts`，使用新的 API
    - 添加验证功能的示例
    - 确保示例代码可以正常运行
    - _Requirements: 12.1, 12.3_
  
  - [~] 11.3 创建迁移指南
    - 创建 `docs/migration-guide.md` 文件
    - 说明从旧版本迁移到新版本的步骤
    - 列出 API 变化（如果有）
    - 提供代码示例
    - _Requirements: 12.1_

- [ ] 12. 回归测试和验证
  - [~] 12.1 更新现有测试用例
    - 更新所有现有测试的预期输出
    - 确保所有测试通过
    - _Requirements: 12.2_
  
  - [~] 12.2 运行完整的测试套件
    - 运行所有单元测试：`npm test`
    - 运行所有属性测试
    - 确保测试覆盖率不低于 80%
    - _Requirements: 12.2, 12.4_
  
  - [~] 12.3 生成测试 IDX 文件
    - 使用示例代码生成 IDX 文件
    - 使用 XSD Schema 验证生成的文件
    - 与参考 IDX 文件对比（如果有）
    - _Requirements: 11.1, 12.4_
  
  - [~] 12.4 性能测试
    - 测量导出大型设计的时间
    - 比较修复前后的性能
    - 测量启用/禁用验证的性能差异
    - 确保性能下降不超过 10%
    - _Requirements: 11.3_

- [~] 13. 最终检查点 - 确保所有测试通过
  - 运行所有测试：`npm test`
  - 验证生成的 IDX 文件完全符合 IDX V4.5 协议
  - 确保所有需求都已实现
  - 如有问题，请向用户报告

## Notes

- 任务标记 `*` 的为可选任务（主要是测试相关），可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号，便于追溯
- 检查点任务确保增量验证，及早发现问题
- 属性测试使用 fast-check 库，每个测试至少运行 100 次迭代
- 单元测试使用 Jest 框架
- 所有代码修改都应该保持向后兼容性
- 优先修复 P0 和 P1 问题，P2 和 P3 问题可以根据时间和资源情况决定是否实现
