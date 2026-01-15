# Requirements Document

## Introduction

IDX导出器是一个TypeScript实现的工具，用于将PCB设计数据导出为IDX v4.5 XML格式。IDX（ECAD/MCAD Collaboration）是由prostep ivip国际协会制定的开放数据交换标准，用于实现电子设计自动化（ECAD）系统和机械设计自动化（MCAD）系统之间的PCB设计数据无缝协作。

本项目专注于导出功能，支持将PCB板、组件、孔、层叠结构等设计数据转换为符合IDX v4.5规范的XML文件，并支持压缩为.idz格式。

## Glossary

- **IDX_Exporter**: 主导出器类，负责协调整个导出流程
- **Builder**: 构建器，负责将输入数据转换为IDX数据结构
- **Assembler**: 组装器，负责将各个构建器的输出组装成完整的IDX数据集
- **Serializer**: 序列化器，负责将IDX数据结构转换为XML字符串
- **Adapter**: 适配器，负责将外部数据源转换为统一的内部数据格式
- **EDMDDataSet**: IDX协议的根数据结构
- **geometryType**: IDX v4.5引入的简化属性，用于标识对象类型
- **CurveSet2d**: 2.5D几何表示，包含2D轮廓和Z轴范围
- **PTH**: Plated Through Hole，金属化通孔
- **NPTH**: Non-Plated Through Hole，非金属化通孔

## Requirements

### Requirement 1: 核心导出流程

**User Story:** 作为开发者，我希望能够将PCB设计数据导出为IDX格式文件，以便与MCAD系统进行数据交换。

#### Acceptance Criteria

1. WHEN 用户提供有效的PCB设计数据 THEN THE IDX_Exporter SHALL 生成符合IDX v4.5规范的XML文件
2. WHEN 导出过程完成 THEN THE IDX_Exporter SHALL 返回包含文件路径、统计信息和问题列表的结果对象
3. WHEN 导出过程中发生错误 THEN THE IDX_Exporter SHALL 捕获错误并返回包含错误信息的结果对象
4. THE IDX_Exporter SHALL 支持配置导出选项，包括输出目录、文件命名模式、压缩选项等

### Requirement 2: PCB板构建

**User Story:** 作为开发者，我希望能够构建PCB板的IDX表示，以便描述板的轮廓和基本属性。

#### Acceptance Criteria

1. WHEN 提供板轮廓数据 THEN THE Board_Builder SHALL 创建带有geometryType="BOARD_OUTLINE"的EDMDItem
2. WHEN 板包含厚度信息 THEN THE Board_Builder SHALL 将厚度添加为用户属性
3. WHEN 板轮廓为矩形 THEN THE Board_Builder SHALL 使用PolyLine定义闭合的矩形轮廓
4. WHEN 板轮廓包含圆弧 THEN THE Board_Builder SHALL 使用CompositeCurve组合直线和圆弧段
5. THE Board_Builder SHALL 为板形状创建CurveSet2d，设置正确的LowerBound和UpperBound

### Requirement 3: 电子组件构建

**User Story:** 作为开发者，我希望能够构建电子组件的IDX表示，以便描述组件的位置、尺寸和属性。

#### Acceptance Criteria

1. WHEN 提供组件数据 THEN THE Component_Builder SHALL 创建带有geometryType="COMPONENT"的装配体项目
2. WHEN 组件包含位置信息 THEN THE Component_Builder SHALL 创建包含2D变换矩阵的ItemInstance
3. WHEN 组件包含引脚信息 THEN THE Component_Builder SHALL 为每个引脚创建PackagePin定义
4. WHEN 组件包含3D模型引用 THEN THE Component_Builder SHALL 创建EDMD3DModel引用
5. THE Component_Builder SHALL 将组件属性（RefDes、PartNumber等）添加为UserProperty
6. THE Component_Builder SHALL 使用AssembleToName属性指定组件安装的层面（TOP或BOTTOM）

### Requirement 4: 机械组件构建

**User Story:** 作为开发者，我希望能够构建机械组件的IDX表示，以便描述散热器、支架等非电气组件。

#### Acceptance Criteria

1. WHEN 提供机械组件数据 THEN THE Component_Builder SHALL 创建带有geometryType="COMPONENT_MECHANICAL"的装配体项目
2. WHEN 机械组件包含外部3D模型 THEN THE Component_Builder SHALL 引用外部STEP或其他格式的模型文件
3. THE Component_Builder SHALL 为机械组件创建与电子组件相同的位置和变换结构

### Requirement 5: 孔构建

**User Story:** 作为开发者，我希望能够构建孔的IDX表示，以便描述安装孔、过孔等穿透板的特征。

#### Acceptance Criteria

1. WHEN 提供金属化孔数据 THEN THE Hole_Builder SHALL 创建带有geometryType="HOLE_PLATED"的项目
2. WHEN 提供非金属化孔数据 THEN THE Hole_Builder SHALL 创建带有geometryType="HOLE_NON_PLATED"的项目
3. WHEN 孔为圆形 THEN THE Hole_Builder SHALL 使用CircleCenter定义孔的形状
4. WHEN 孔为异形孔 THEN THE Hole_Builder SHALL 使用PolyLine定义孔的轮廓
5. THE Hole_Builder SHALL 为孔形状设置Inverted=true以表示切除材料
6. THE Hole_Builder SHALL 设置孔的Z轴范围从0到板厚

### Requirement 6: 禁止区域构建

**User Story:** 作为开发者，我希望能够构建禁止区域的IDX表示，以便描述组件放置禁区、布线禁区等约束区域。

#### Acceptance Criteria

1. WHEN 提供组件禁止区数据 THEN THE Keepout_Builder SHALL 创建带有geometryType="KEEPOUT_AREA_COMPONENT"的项目
2. WHEN 提供布线禁止区数据 THEN THE Keepout_Builder SHALL 创建带有geometryType="KEEPOUT_AREA_ROUTE"的项目
3. WHEN 提供过孔禁止区数据 THEN THE Keepout_Builder SHALL 创建带有geometryType="KEEPOUT_AREA_VIA"的项目
4. THE Keepout_Builder SHALL 使用AssembleToName指定禁止区所在的层面
5. THE Keepout_Builder SHALL 为禁止区设置正确的Z轴范围以定义高度限制

### Requirement 7: 保持区域构建

**User Story:** 作为开发者，我希望能够构建保持区域的IDX表示，以便描述必须放置组件或布线的区域。

#### Acceptance Criteria

1. WHEN 提供组件保持区数据 THEN THE Keepin_Builder SHALL 创建带有geometryType="KEEPIN_AREA_COMPONENT"的项目
2. WHEN 提供布线保持区数据 THEN THE Keepin_Builder SHALL 创建带有geometryType="KEEPIN_AREA_ROUTE"的项目
3. THE Keepin_Builder SHALL 使用与禁止区相同的结构，但使用不同的geometryType

### Requirement 8: 层构建

**User Story:** 作为开发者，我希望能够构建层的IDX表示，以便描述多层板的层叠结构。

#### Acceptance Criteria

1. WHEN 提供物理层数据 THEN THE Layer_Builder SHALL 创建EDMDStratum项目
2. WHEN 层为信号层 THEN THE Layer_Builder SHALL 设置LayerPurpose为OTHERSIGNAL
3. WHEN 层为电源层 THEN THE Layer_Builder SHALL 设置LayerPurpose为POWERORGROUND
4. WHEN 层为阻焊层 THEN THE Layer_Builder SHALL 设置LayerPurpose为SOLDERMASK
5. THE Layer_Builder SHALL 为每个层设置厚度和材料属性
6. WHEN 提供层叠结构数据 THEN THE Layer_Builder SHALL 创建包含所有物理层的层叠定义

### Requirement 9: 几何形状构建

**User Story:** 作为开发者，我希望能够构建各种几何形状的IDX表示，以便描述板轮廓、组件外形等。

#### Acceptance Criteria

1. WHEN 提供点列表 THEN THE Geometry_Builder SHALL 创建PolyLine曲线
2. WHEN 提供圆形数据 THEN THE Geometry_Builder SHALL 创建CircleCenter曲线
3. WHEN 提供圆弧数据 THEN THE Geometry_Builder SHALL 创建Arc曲线
4. WHEN 需要组合多种曲线 THEN THE Geometry_Builder SHALL 创建CompositeCurve
5. THE Geometry_Builder SHALL 为所有曲线创建包含LowerBound和UpperBound的CurveSet2d
6. THE Geometry_Builder SHALL 确保闭合轮廓的首尾点相同

### Requirement 10: 数据组装

**User Story:** 作为开发者，我希望能够将各个构建器的输出组装成完整的IDX数据集，以便生成有效的IDX文件。

#### Acceptance Criteria

1. WHEN 组装基线消息 THEN THE Assembler SHALL 创建包含Header、Body和ProcessInstruction的EDMDDataSet
2. THE Assembler SHALL 在Header中设置创建者信息、时间戳和全局单位
3. THE Assembler SHALL 在Body中收集所有构建的项目、形状和3D模型
4. THE Assembler SHALL 设置ProcessInstruction类型为SendInformation
5. WHEN 组件引用外部形状 THEN THE Assembler SHALL 将形状定义添加到Body的Shapes数组
6. WHEN 组件引用3D模型 THEN THE Assembler SHALL 将模型定义添加到Body的Models3D数组

### Requirement 11: XML序列化

**User Story:** 作为开发者，我希望能够将IDX数据结构序列化为XML字符串，以便保存为文件。

#### Acceptance Criteria

1. WHEN 序列化EDMDDataSet THEN THE Serializer SHALL 生成包含所有必需命名空间的XML根元素
2. THE Serializer SHALL 按照Header、Body、ProcessInstruction的顺序序列化元素
3. WHEN 项目包含geometryType属性 THEN THE Serializer SHALL 将其作为XML属性输出
4. WHEN 项目包含用户属性 THEN THE Serializer SHALL 为每个属性创建UserProperty元素
5. THE Serializer SHALL 使用正确的命名空间前缀（foundation、pdm、d2等）
6. THE Serializer SHALL 生成格式化的XML输出，包含适当的缩进和换行
7. THE Serializer SHALL 在XML声明中指定UTF-8编码

### Requirement 12: 文件压缩

**User Story:** 作为开发者，我希望能够将IDX文件压缩为.idz格式，以便减小文件大小。

#### Acceptance Criteria

1. WHEN 配置启用压缩 THEN THE Compressor SHALL 使用jszip创建ZIP压缩文件
2. THE Compressor SHALL 将XML文件添加到ZIP归档中
3. WHEN 包含外部3D模型 THEN THE Compressor SHALL 将模型文件一起添加到ZIP归档
4. THE Compressor SHALL 使用.idz作为压缩文件的扩展名
5. THE Compressor SHALL 保持ZIP归档内的目录结构

### Requirement 13: 数据适配

**User Story:** 作为开发者，我希望能够适配不同来源的PCB数据，以便支持多种ECAD系统。

#### Acceptance Criteria

1. WHEN 提供外部数据源 THEN THE Adapter SHALL 将其转换为统一的内部数据格式
2. THE Adapter SHALL 执行单位转换，将所有尺寸转换为配置的基准单位
3. WHEN 外部数据包含不支持的特征 THEN THE Adapter SHALL 记录警告并跳过该特征
4. THE Adapter SHALL 验证必需字段的存在性
5. THE Adapter SHALL 为缺失的可选字段提供默认值

### Requirement 14: 配置管理

**User Story:** 作为开发者，我希望能够配置导出器的行为，以便适应不同的使用场景。

#### Acceptance Criteria

1. THE IDX_Exporter SHALL 接受包含输出选项、几何选项和协作选项的配置对象
2. WHEN 未提供配置 THEN THE IDX_Exporter SHALL 使用合理的默认值
3. THE IDX_Exporter SHALL 支持配置输出目录、文件命名模式和压缩选项
4. THE IDX_Exporter SHALL 支持配置是否使用简化表示法（geometryType）
5. THE IDX_Exporter SHALL 支持配置全局单位和精度
6. THE IDX_Exporter SHALL 支持配置创建者信息

### Requirement 15: 错误处理和验证

**User Story:** 作为开发者，我希望导出器能够验证数据并提供清晰的错误信息，以便快速定位和修复问题。

#### Acceptance Criteria

1. WHEN 输入数据缺少必需字段 THEN THE IDX_Exporter SHALL 抛出包含字段名称的验证错误
2. WHEN 几何数据无效 THEN THE Geometry_Builder SHALL 抛出包含详细信息的几何错误
3. WHEN 构建过程中发生错误 THEN THE Builder SHALL 记录错误上下文信息
4. THE IDX_Exporter SHALL 收集所有警告和非致命错误到问题列表
5. THE IDX_Exporter SHALL 在导出结果中包含问题列表和统计信息

### Requirement 16: 唯一标识符生成

**User Story:** 作为开发者，我希望导出器能够为所有IDX对象生成唯一标识符，以便支持变更追踪。

#### Acceptance Criteria

1. THE Builder SHALL 为每个EDMDItem生成唯一的id属性
2. THE Builder SHALL 为每个项目创建包含SystemScope、Number、Version、Revision和Sequence的Identifier
3. WHEN 导出基线消息 THEN THE Builder SHALL 将所有项目的Sequence设置为1
4. THE Builder SHALL 使用一致的命名模式生成id（如"BOARD_001"、"COMP_U1_001"）
5. THE Builder SHALL 确保同一导出会话中不会生成重复的id

### Requirement 17: 单位转换

**User Story:** 作为开发者，我希望导出器能够处理不同的单位系统，以便支持使用不同单位的数据源。

#### Acceptance Criteria

1. THE Adapter SHALL 支持毫米、英寸、密尔等常用长度单位
2. WHEN 输入数据使用非默认单位 THEN THE Adapter SHALL 将所有尺寸转换为配置的全局单位
3. THE Adapter SHALL 在转换过程中保持配置的精度
4. THE Serializer SHALL 在Header中设置GlobalUnitLength为配置的全局单位
5. THE Adapter SHALL 支持角度单位转换（度和弧度）

### Requirement 18: 2D变换矩阵

**User Story:** 作为开发者，我希望导出器能够正确处理组件的位置和旋转，以便准确描述组件在板上的放置。

#### Acceptance Criteria

1. WHEN 组件包含位置和旋转 THEN THE Component_Builder SHALL 创建2D变换矩阵
2. THE Component_Builder SHALL 根据旋转角度计算变换矩阵的xx、xy、yx、yy分量
3. THE Component_Builder SHALL 将位置坐标设置为变换矩阵的tx和ty分量
4. WHEN 旋转角度为0 THEN THE Component_Builder SHALL 生成单位矩阵（xx=1, yy=1, xy=0, yx=0）
5. THE Component_Builder SHALL 使用弧度制进行三角函数计算

### Requirement 19: 相对定位

**User Story:** 作为开发者，我希望导出器能够使用IDX的相对定位模型，以便组件位置随层叠变化自动更新。

#### Acceptance Criteria

1. WHEN 组件安装在顶层 THEN THE Component_Builder SHALL 设置AssembleToName为"TOP"
2. WHEN 组件安装在底层 THEN THE Component_Builder SHALL 设置AssembleToName为"BOTTOM"
3. WHEN 组件安装在内层 THEN THE Component_Builder SHALL 设置AssembleToName为该层的名称
4. THE Component_Builder SHALL 不为组件设置绝对Z坐标
5. WHERE 支持zOffset属性 THE Component_Builder SHALL 使用zOffset指定相对于层面的偏移

### Requirement 20: 外部文件引用

**User Story:** 作为开发者，我希望导出器能够引用外部3D模型文件，以便支持复杂的组件形状。

#### Acceptance Criteria

1. WHEN 组件包含3D模型路径 THEN THE Component_Builder SHALL 创建EDMD3DModel引用
2. THE Component_Builder SHALL 设置模型的路径、格式和格式版本
3. THE Component_Builder SHALL 支持STEP、IGES等常见3D格式
4. WHEN 模型需要对齐变换 THEN THE Component_Builder SHALL 在EDMD3DModel中添加变换矩阵
5. WHEN 启用压缩 THEN THE Compressor SHALL 将引用的3D模型文件包含在.idz归档中
