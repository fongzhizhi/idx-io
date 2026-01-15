# Requirements Document

## Introduction

IDX导出器已经完成了大部分核心功能，当前验证通过率达到96.2%（25/26）。本规范专注于完善剩余的核心功能，包括修复示例文件的类型错误、实现完整的层支持功能、优化XML结构以达到100%验证通过率、完善数据接口和类型定义，以及增强错误处理和验证机制。

## Glossary

- **IDX_Exporter**: IDX格式文件导出器系统
- **ExportSourceData**: 导出源数据接口，定义输入数据的结构
- **BoardData**: 板数据接口，包含PCB板的基本信息
- **LayerBuilder**: 层构建器，负责处理PCB层数据
- **XMLWriter**: XML写入器，负责序列化数据为XML格式
- **ValidationEngine**: 验证引擎，负责数据验证和错误检查
- **TypeDefinition**: 类型定义，包含所有数据接口和类型声明

## Requirements

### Requirement 1: 修复示例文件类型错误

**User Story:** 作为开发者，我希望示例文件能够正确编译和运行，以便我能够快速了解如何使用IDX导出器。

#### Acceptance Criteria

1. WHEN ExportSourceData接口被使用时，THE IDX_Exporter SHALL 支持components、holes、keepouts等可选属性
2. WHEN 示例文件被编译时，THE TypeDefinition SHALL 不产生任何类型错误
3. WHEN export-basic.ts示例运行时，THE IDX_Exporter SHALL 成功导出基础板数据
4. WHEN export-with-layers.ts示例运行时，THE IDX_Exporter SHALL 成功处理多层板数据

### Requirement 2: 实现完整的层支持功能

**User Story:** 作为PCB设计师，我希望能够导出多层板设计，包括层叠结构信息，以便与其他工具进行协作。

#### Acceptance Criteria

1. WHEN LayerBuilder被调用时，THE IDX_Exporter SHALL 创建符合IDX规范的层定义
2. WHEN 多层板数据被处理时，THE IDX_Exporter SHALL 正确处理层叠结构（layer stackup）
3. WHEN 层数据包含厚度信息时，THE IDX_Exporter SHALL 在XML中正确表示层厚度
4. WHEN 层数据包含材料信息时，THE IDX_Exporter SHALL 在XML中包含材料属性
5. WHEN includeLayerStackup配置为true时，THE IDX_Exporter SHALL 在输出中包含完整的层叠信息

### Requirement 3: 优化XML结构以达到100%验证通过率

**User Story:** 作为质量保证工程师，我希望导出的IDX文件能够100%通过验证，以确保与其他工具的完全兼容性。

#### Acceptance Criteria

1. WHEN 组件被导出时，THE XMLWriter SHALL 使用正确的ItemType值（single而不是assembly）
2. WHEN XML结构被生成时，THE ValidationEngine SHALL 验证所有必需的属性都存在
3. WHEN IDX文件被验证时，THE IDX_Exporter SHALL 通过所有26项验证检查
4. WHEN XML被序列化时，THE XMLWriter SHALL 确保所有元素符合IDX 4.5规范

### Requirement 4: 完善数据接口和类型定义

**User Story:** 作为API用户，我希望有清晰完整的数据接口定义，以便我能够正确构造输入数据。

#### Acceptance Criteria

1. WHEN ExportSourceData接口被定义时，THE TypeDefinition SHALL 包含components、holes、keepouts等可选属性
2. WHEN BoardData接口被使用时，THE TypeDefinition SHALL 支持所有必需和可选的板属性
3. WHEN 组件数据被定义时，THE TypeDefinition SHALL 包含完整的组件属性结构
4. WHEN 孔数据被定义时，THE TypeDefinition SHALL 区分镀孔和非镀孔类型
5. WHEN 禁止区数据被定义时，THE TypeDefinition SHALL 包含几何形状和约束信息

### Requirement 5: 增强错误处理和验证机制

**User Story:** 作为系统集成者，我希望在数据有问题时能够获得清晰的错误信息和恢复建议，以便快速定位和解决问题。

#### Acceptance Criteria

1. WHEN 输入数据缺少必需字段时，THE ValidationEngine SHALL 返回具体的错误信息
2. WHEN 数据格式不正确时，THE ValidationEngine SHALL 提供详细的验证失败原因
3. WHEN 导出过程中发生错误时，THE IDX_Exporter SHALL 提供错误恢复建议
4. WHEN 数据验证失败时，THE ValidationEngine SHALL 指出具体的问题位置和修复方法
5. WHEN 警告条件被检测到时，THE IDX_Exporter SHALL 记录警告但继续处理

### Requirement 6: 解析和序列化一致性

**User Story:** 作为数据处理工程师，我希望导出的数据能够被正确解析，以确保数据的完整性和一致性。

#### Acceptance Criteria

1. WHEN IDX文件被导出时，THE XMLWriter SHALL 生成有效的XML结构
2. WHEN XML数据被序列化时，THE XMLWriter SHALL 保持数据的精度和格式
3. THE XMLWriter SHALL 格式化XML输出以提高可读性
4. FOR ALL 有效的板数据对象，序列化然后反序列化应该产生等价的对象（round-trip property）

### Requirement 7: XML可读性增强

**User Story:** 作为开发者和调试人员，我希望导出的XML文件包含有意义的注释，以便更好地理解文件结构和内容。

#### Acceptance Criteria

1. WHEN XML文件被生成时，THE XMLWriter SHALL 在关键部分添加描述性注释
2. WHEN 组件数据被序列化时，THE XMLWriter SHALL 添加组件信息的注释说明
3. WHEN 层数据被序列化时，THE XMLWriter SHALL 添加层结构的注释说明
4. WHEN 几何数据被序列化时，THE XMLWriter SHALL 添加几何类型和参数的注释说明
5. THE XMLWriter SHALL 在文件头部添加生成信息和版本注释