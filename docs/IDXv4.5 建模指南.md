# IDXv4.5 建模指南

## IDX简介

### 🎯 本质定义

**IDX** 是一种由 **prostep ivip** 国际协会制定的、基于XML的**开放数据交换标准**，全称为 **“ECAD/MCAD Collaboration”**。它的核心使命是**在电子设计自动化（ECAD）系统和机械设计自动化（MCAD）系统之间，实现印刷电路板（PCB）设计数据的无缝、精确和双向协作**。

**IDX协议** 是以 **EDMD** 数据模型为基础，在 **ECAD**（电气方）与 **MCAD**（机械方）之间实现PCB设计协作的标准化框架，是一种基于XML的标准数据格式与通信协议。

### 🌟 核心特性与设计理念

1.  **专注于PCB协作**
    *   **目标明确**：专为PCB及其相关对象（板框、层叠、元件、过孔、禁止区等）的协作而设计，不是通用的3D格式。
    *   **2.5D几何**：采用“平移体”概念描述形状，即2D轮廓（曲线、多边形）加上Z轴范围（上下边界），高效描述典型的PCB板状结构。

2.  **双向变更与流程管理**
    *   **不只是导出**：IDX支持完整的协作流程，包括发送基线、提议变更、接受/拒绝变更、确认执行等。
    *   **变更追踪**：通过唯一的标识符（`Identifier`）和序列号（`Sequence`）精确追踪每个设计元素的每一次变更，确保双方系统状态同步。

3.  **智能的相对定位模型（被动PCB模型）**
    *   **革命性设计**：元件、孔等对象不依赖绝对的XYZ坐标，而是通过 **`AssembleToName`** 属性关联到某个层或层叠的表面。
    *   **巨大优势**：当PCB厚度或层叠结构改变时，所有关联的对象位置会自动、正确地更新，避免了手动调整的繁琐和错误。

4.  **可扩展与向前兼容**
    *   **简化表示**：IDXv4.0引入了 **`geometryType`** 属性，允许用更简洁的XML结构清晰声明对象的类型（如 `BOARD_OUTLINE`， `COMPONENT`），同时兼容旧式详细结构。
    *   **定义明确**：所有对象类型、属性、几何元素都有严格的XML Schema定义，确保不同软件生成和解析文件的一致性。

### 🔧 典型工作流程（基于文件交换）

1.  **建立基线**：ECAD系统生成一个 **`SendInformation`** 消息（IDX文件），包含完整的PCB初始设计（板框、层叠、所有元件等），发送给MCAD。双方就此基线达成一致。
2.  **提议变更**：机械工程师在MCAD中发现干涉或需要优化，在3D模型中移动一个元件后，MCAD系统生成一个 **`SendChanges`** 消息（变更文件），仅包含被移动元件的新位置信息。
3.  **审查与响应**：电气工程师在ECAD中收到变更文件，审查电气规则影响。然后ECAD发回一个 **`SendChanges`** 消息（响应文件），声明接受或拒绝此变更。
4.  **（可选）确认**：MCAD收到接受响应后，可发送一个 **“Clearance”** 文件，确认变更已应用，流程完成。

### 💡 解决了哪些关键问题？

| 痛点             | IDX解决方案                                                                                                          |
| :--------------- | :------------------------------------------------------------------------------------------------------------------- |
| **数据失真**     | 通过精确的2.5D几何和标准化属性定义，避免了通用格式（如STEP）转换中的信息丢失。                                       |
| **变更管理混乱** | 内置的变更提议/响应协议，确保每一次修改都可追溯、可确认，防止设计版本分歧。                                          |
| **设计迭代低效** | 机械工程师可直接在3D环境中提出建议（如移动元件避开结构件），并以ECAD能直接处理的形式反馈，无需截图、邮件、口头描述。 |
| **跨领域误解**   | 提供了一套共同的语言和精确的数据模型，减少了电气与机械团队之间的沟通误差。                                           |

### 🆚 与其他格式的对比

*   **IDF (Intermediate Data Format)**：IDX的前身和灵感来源，但IDF是**单向**（通常ECAD到MCAD）、**静态**的导出格式，**不支持变更协作流程**，数据模型也较简单。
*   **STEP / IGES**：强大的通用3D几何交换格式，但**不包含PCB特有的电气和协作语义**（如网络、层叠、元件属性、变更意图），转换过程中设计意图易丢失。
*   **专用插件/接口**：各大EDA和MCAD软件间的点对点解决方案，通常**不开放、扩展性差、依赖特定版本**。IDX作为**开放标准**，打破了这种“供应商锁定”。

### 🚀 应用场景

*   **机电协同设计**：在紧凑空间（如手机、物联网设备）中，确保PCB与外壳、散热器、连接器等的完美匹配。
*   **设计审查**：机械团队在3D上下文中提前进行可制造性、可装配性、散热分析。
*   **供应链协作**：将包含精确3D模型的PCB设计数据传递给外壳供应商或模具制造商。
*   **自动化流程**：集成到PLM/PDM或CI/CD流程中，实现设计检查的自动化。



根据《ECAD/MCAD Collaboration Implementation Guidelines v4.5》，以下是IDX建模的重点内容总结，特别是**传统方法（Traditional）**与**推荐方法（Simplified，基于geometryType）**的对比。

## IDX建模核心架构

IDX使用 **EDMDDataSet** 作为根结构，包含：
- **Header**：元数据（创建者、单位、时间戳等）
- **Body**：所有项目（Item）及其几何形状的定义
- **ProcessInstruction**：消息类型（SendInformation、SendChanges等）

**核心建模单元是 `EDMDItem`**，分为：
- `assembly` 类型：表示实例（如一个具体的元件放置）
- `single` 类型：表示定义（如元件封装定义）

```xml
<foundation:EDMDDataSet xmlns:foundation="..." xmlns:pdm="..." xmlns:d2="...">
  <!-- 1. 头部信息 -->
  <foundation:Header>
    <foundation:CreatorCompany>YourCompany</foundation:CreatorCompany>
    <foundation:GlobalUnitLength>UNIT_MM</foundation:GlobalUnitLength>
    <foundation:CreationDateTime>2024-01-01T10:00:00Z</foundation:CreationDateTime>
  </foundation:Header>
  
  <!-- 2. 主体数据 -->
  <foundation:Body>
    <!-- 所有项目(板、组件、孔等)定义在此 -->
  </foundation:Body>
  
  <!-- 3. 处理指令 -->
  <foundation:ProcessInstruction xsi:type="computational:EDMDProcessInstructionSendInformation"/>
</foundation:EDMDDataSet>
```

## 传统方法 vs. 推荐方法（IDXv4.0+）

IDXv4.0 引入了 **`geometryType` 属性**，显著简化了建模结构。

| 方面             | 传统方法（Traditional）                                      | 推荐方法（Simplified）                                       |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **识别项目类型** | 通过多层嵌套的对象类型判断（如 `EDMDKeepOut`、`EDMDInterStratumFeature`） | 在顶层 `EDMDItem` 上使用 `geometryType` 属性（如 `KEEPOUT_AREA_ROUTE`） |
| **结构复杂度**   | 多层嵌套：Item → 特定对象（如 KeepOut） → ShapeElement → CurveSet2D → 几何元素 | 扁平化：Item（带 geometryType）→ ShapeElement → CurveSet2D → 几何元素 |
| **可读性**       | 较低，需深入XML层级判断类型                                  | 高，顶层属性直接说明类型                                     |
| **文件大小**     | 较大，因多层对象和冗余标签                                   | 较小，省去中间对象层                                         |
| **向后兼容**     | 兼容所有IDX版本                                              | 仅IDXv4.0+支持                                               |
| **未来兼容性**   | 未来版本可能弃用                                             | 推荐使用，为未来版本优化                                     |

## 重要建模要点

### 几何形状标识（2.5D）

两种方法在几何表示上一致：

- 使用 **`EDMDCurveSet2D`** 定义二维轮廓 + Z轴范围（LowerBound/UpperBound）
- 支持多种曲线类型：PolyLine、Arc、Circle、BSpline、Ellipse 等
- 可通过 **`Inverted`** 属性实现布尔减运算（如切孔）

### 板层堆叠（Layer Stackup）

- 使用 `geometryType="LAYER_STACKUP"`
- 定义物理层（如信号层、阻焊层、丝印层）及其Z轴位置
- 支持多区域不同堆叠（如刚柔结合板）

### 元件引脚与热属性
- IDXv4.0+ 支持在 `EDMDItem` 中定义 `PackagePin`
- 可添加热属性（如 `POWER_OPR`、`THERM_COND`）作为用户属性

### 非协作项目标记
- 在 `ItemInstance` 上通过 `RoleOnItemInstance` 标记所有权
- 用于防止对方系统修改特定项目

### 文件与压缩
- 标准文件后缀：`.idx`
- 压缩文件后缀：`.idz`（推荐使用 DEFLATE 算法）

### 总结建议

| 场景           | 推荐做法                                                     |
| -------------- | ------------------------------------------------------------ |
| **新项目开发** | 一律使用 **推荐方法（geometryType）**，结构清晰且未来兼容    |
| **旧系统兼容** | 可暂时使用传统方法，但建议逐步迁移                           |
| **复杂板型**   | 结合板层堆叠、柔性区、弯曲区域建模                           |
| **协作流程**   | 使用 `SendInformation` 发基线，`SendChanges` 发变更与响应    |
| **文件管理**   | 使用 `.idz` 压缩以减少文件大小，遵循命名约定（如 `Cellphone_baseline_00.idz`） |

若实施IDX接口，**强烈建议直接采用IDXv4.0+的推荐方法**，以减少解析复杂度、提高可维护性，并为未来版本升级做好准备。

## geometryType类型参考

### ✅ 板级轮廓与区域类型
| geometryType           | 描述                       | 对应传统对象（可省略）                      |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `BOARD_OUTLINE`        | 板框轮廓（简单板）         | `EDMDStratum`                               |
| `BOARD_AREA_FLEXIBLE`  | 柔性区域（在层区域中定义） | `EDMDFunctionalItemShape`（`FlexibleArea`） |
| `BOARD_AREA_STIFFENER` | 加强区域                   | `EDMDFunctionalItemShape`（`Stiffener`）    |
| `BOARD_AREA_RIGID`     | 刚性区域（默认）           | `EDMDFunctionalItemShape`（`RigidArea`）    |

### ✅ 组件类型
| geometryType           | 描述                       | 对应传统对象（可省略）                      |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `COMPONENT`            | 电气组件（PCB元件）        | `EDMDAssemblyComponent`（`Physical`）       |
| `COMPONENT_MECHANICAL` | 机械组件（如散热片、支架） | `EDMDAssemblyComponent`（`MechanicalItem`） |

### ✅ 孔与过孔类型
| geometryType            | 描述                 | 对应传统对象（可省略）                               |
| ----------------------- | -------------------- | ---------------------------------------------------- |
| `HOLE_PLATED`           | 金属化孔（如PTH）    | `EDMDInterStratumFeature`（`PlatedCutout`）          |
| `HOLE_NON_PLATED`       | 非金属化孔（如NPTH） | `EDMDInterStratumFeature`（`Cutout`）                |
| `HOLE_PLATED_MILLED`    | 金属化铣切孔         | `EDMDInterStratumFeature`（`PartiallyPlatedCutout`） |
| `HOLE_NONPLATED_MILLED` | 非金属化铣切孔       | `EDMDInterStratumFeature`（`MilledCutout`）          |
| `VIA`                   | 过孔（信号孔）       | `EDMDInterStratumFeature`（`Via`）                   |
| `FILLED_VIA`            | 填充过孔             | `EDMDInterStratumFeature`（`FilledVia`）             |

### ✅ 禁布区（Keepout）类型
| geometryType             | 描述                  | 对应传统对象（可省略）                        |
| ------------------------ | --------------------- | --------------------------------------------- |
| `KEEPOUT_AREA_ROUTE`     | 布线禁布区            | `EDMDKeepOut`（`Purpose=Route`）              |
| `KEEPOUT_AREA_COMPONENT` | 组件放置禁布区        | `EDMDKeepOut`（`Purpose=ComponentPlacement`） |
| `KEEPOUT_AREA_VIA`       | 过孔禁布区            | `EDMDKeepOut`（`Purpose=Via`）                |
| `KEEPOUT_AREA_TESTPOINT` | 测试点禁布区          | `EDMDKeepOut`（`Purpose=TestPoint`）          |
| `KEEPOUT_AREA_OTHER`     | 其他禁布区            | `EDMDKeepOut`（`Purpose=Other`）              |
| `KEEPOUT_AREA_THERMAL`   | 热禁布区（表6中列出） | `EDMDKeepOut`（`Purpose=Thermal`）            |

### ✅ 保留区（Keepin）类型
| geometryType            | 描述           | 对应传统对象（可省略）                       |
| ----------------------- | -------------- | -------------------------------------------- |
| `KEEPIN_AREA_ROUTE`     | 布线保留区     | `EDMDKeepIn`（`Purpose=Route`）              |
| `KEEPIN_AREA_COMPONENT` | 组件放置保留区 | `EDMDKeepIn`（`Purpose=ComponentPlacement`） |
| `KEEPIN_AREA_VIA`       | 过孔保留区     | `EDMDKeepIn`（`Purpose=Via`）                |
| `KEEPIN_AREA_TESTPOINT` | 测试点保留区   | `EDMDKeepIn`（`Purpose=TestPoint`）          |
| `KEEPIN_AREA_OTHER`     | 其他保留区     | `EDMDKeepIn`（`Purpose=Other`）              |

### ✅ 其他区域类型
| geometryType           | 描述                                   | 对应传统对象（可省略）                            |
| ---------------------- | -------------------------------------- | ------------------------------------------------- |
| `PLACEMENT_GROUP_AREA` | 放置组区域（相关组件分组）             | `EDMDFunctionalItemShape`（`PlacementGroupArea`） |
| `OTHER_OUTLINE`        | 其他轮廓（用户自定义区域，如Logo位置） | `EDMDFunctionalItemShape`（`UserArea`）           |
| `BEND`                 | 弯曲区域（柔性板弯曲定义）             | `EDMDBend`                                        |

### ✅ 铜层与图形类型
| geometryType   | 描述               | 对应传统对象（可省略）                       |
| -------------- | ------------------ | -------------------------------------------- |
| `COPPER_PAD`   | 铜焊盘             | `EDMDStratum` + `LayerPurpose=LandsOnly`     |
| `COPPER_TRACE` | 铜走线             | `EDMDStratum` + `LayerPurpose=OtherSignal`   |
| `COPPER_AREA`  | 铜区域（如电源层） | `EDMDStratum` + `LayerPurpose=PowerOrGround` |
| `SOLDERMASK`   | 阻焊层             | `EDMDStratum` + `LayerPurpose=SolderMask`    |
| `SILKSCREEN`   | 丝印层             | `EDMDStratum` + `LayerPurpose=Silkscreen`    |

### ✅ 物理层类型（用于层叠结构定义）
| geometryType                    | 描述                             | 对应传统对象（可省略）        |
| ------------------------------- | -------------------------------- | ----------------------------- |
| `LAYER_SOLDERMASK`              | 阻焊层（物理层）                 | 通过 `LayerType` 用户属性定义 |
| `LAYER_SOLDERPASTE`             | 焊膏层                           | 同上                          |
| `LAYER_SILKSCREEN`              | 丝印层（物理层）                 | 同上                          |
| `LAYER_GENERIC`                 | 通用层                           | 同上                          |
| `LAYER_GLUE`                    | 胶层                             | 同上                          |
| `LAYER_GLUEMASK`                | 胶膜层                           | 同上                          |
| `LAYER_PASTEMASK`               | 焊膏掩膜层                       | 同上                          |
| `LAYER_OTHERSIGNAL`             | 其他信号层                       | 同上                          |
| `LAYER_LANDSONLY`               | 仅焊盘层                         | 同上                          |
| `LAYER_POWERORGROUND`           | 电源或地层                       | 同上                          |
| `LAYER_EMBEDDED_CAP_DIELECTRIC` | 嵌入式电容电介质层               | 同上                          |
| `LAYER_EMBEDDED_RESISTOR`       | 嵌入式电阻层                     | 同上                          |
| `LAYER_DIELECTRIC`              | 电介质层（绝缘层）               | 同上                          |
| `LAYER_STACKUP`                 | 层叠结构（多个物理层的堆叠定义） | 无直接对应，为组合对象        |

### ✅ 备注说明

- **简化方法**：在IDXv4.5中，只要在顶层的 `EDMDItem`（`ItemType="assembly"`）上指定 `geometryType`，即可省略传统的中间对象（如 `EDMDKeepOut`、`EDMDAssemblyComponent` 等），直接引用形状元素（`ShapeElement`）。
- **向后兼容**：IDXv4.5支持传统方法和简化方法，但**推荐使用简化方法**以减少XML文件大小和复杂度。
- **文档依据**：以上列表整理自文档第6节（各特征建模）、表4（物理层类型）、表6-7（禁布/保留区类型）、表8（所有项目类型总结）以及第9节（属性术语表）。



## IDX分层构建的建模方案

### 分层建模思路

分层构建即按照项目建模的数据层次，依次构建：

```txt
构建所有Points → 所有几何元素Geometry → 所有曲线集CurveSet2D → 所有形状元素ShapeElement -> 所有的传统对象如EDMDStratum(简化建模可忽略) → 所有的物理层和层堆叠（可选）→ 所有的3D模型（可选） → 所有的封装（可选）-> 所有Item定义(Single) -> 所有Item实例与装配(Assembly)
```

### 分层构建详解

#### **第1层：点 (Points)**

**完整示例**：

```xml
<!-- TEST_CASE: 坐标点定义 -->
<foundation:CartesianPoint id="PT_001" xsi:type="d2:EDMDCartesianPoint">
  <!-- X坐标，必须使用 EDMDLengthProperty 类型 -->
  <d2:X xsi:type="property:EDMDLengthProperty">
    <property:Value>10.000000</property:Value>
     <!-- 可选：单位说明，通常由全局 GlobalUnitLength 定义 -->
    <property:Unit>UNIT_MM</property:Unit>
  </d2:X>
  <!-- Y坐标 -->
  <d2:Y xsi:type="property:EDMDLengthProperty">
    <property:Value>20.000000</property:Value>
  </d2:Y>
  <!-- Z坐标。可选，不常用，2D点没有Z坐标 -->
  <d2:Y xsi:type="property:EDMDLengthProperty">
    <property:Value>30.000000</property:Value>
  </d2:Y>
</foundation:CartesianPoint>
```

**注意事项**

无特殊注意事项。传统建模与优化建模无差异。

**类型定义**

```ts
/**
 * IDX协议中所有对象的基接口
 *
 * @remarks
 * IDX规范中所有对象都包含id和可能的属性变更标记
 */
export interface EDMDObject {
	/** 对象唯一标识符，在上下文中必须唯一 */
	id: string;
	/** 标记对象属性是否已变更 */
	IsAttributeChanged?: boolean;
	/** 对象名称 */
	Name?: string;
	/** 对象描述 */
	Description?: string;
	/** 用户自定义属性 */
	UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 二维笛卡尔坐标点
 *
 * @remarks
 * 用于描述PCB板上的位置，单位由GlobalUnitLength定义
 * REF: Section 7.1.10
 */
export interface CartesianPoint extends EDMDObject {
	/** X坐标值 */
	X: number;
	/** Y坐标值 */
	Y: number;
	/** Z坐标值(不常用) */
	Z?: number;
}
```

#### **第2层：几何元素 (Geometry)**

**支持的几何元素列表**：

| 几何元素               | 描述                       | 主要用途               | REF     |
| ---------------------- | -------------------------- | ---------------------- | ------- |
| **EDMDPolyLine**       | 多段线（可闭合，可带厚度） | 板轮廓、走线、铣削路径 | 7.1.7   |
| **EDMDArc**            | 三点式圆弧                 | 圆角、弧形轮廓         | 7.1.1   |
| **EDMDCircleCenter**   | 圆心+直径式圆              | 安装孔、过孔、圆形焊盘 | 7.1.4   |
| **EDMDCircle3Point**   | 三点式圆                   | 特殊圆形定义           | 7.1.3   |
| **EDMDEllipse**        | 椭圆                       | 椭圆形焊盘、特殊轮廓   | 7.1.5   |
| **EDMDBSplineCurve**   | B样条曲线                  | 复杂自由曲线           | 7.1.2   |
| **EDMDCompositeCurve** | 复合曲线                   | 组合多种曲线类型       | 7.1.8   |
| **EDMDLine**           | 无限直线（点+向量）        | 弯曲区域轴线           | 6.1.2.4 |

**完整示例**：

```xml
<!-- =========== 1. 多段线 (EDMDPolyLine) =========== -->
<!-- TEST_CASE: 多段线 - 基本定义 -->
<foundation:PolyLine id="POLYLINE_001" xsi:type="d2:EDMDPolyLine">
  <!-- 点序列，引用已定义的CartesianPoint的id（必需） -->
  <d2:Point>PT_001</d2:Point>
  <d2:Point>PT_002</d2:Point>
  <d2:Point>PT_003</d2:Point>
  <!-- 可选：闭合曲线，重复第一个点 -->
  <d2:Point>PT_001</d2:Point>
</foundation:PolyLine>

<!-- TEST_CASE: 多段线 - 带厚度（用于走线或铣削路径） -->
<foundation:PolyLine id="POLYLINE_TRACE_001" xsi:type="d2:EDMDPolyLine">
  <!-- 厚度：用于表示走线宽度或铣削刀具直径 -->
  <d2:Thickness xsi:type="property:EDMDLengthProperty">
    <property:Value>0.200000</property:Value>
  </d2:Thickness>
  <d2:Point>PT_010</d2:Point>
  <d2:Point>PT_011</d2:Point>
  <d2:Point>PT_012</d2:Point>
</foundation:PolyLine>

<!-- =========== 2. 圆弧 (EDMDArc) =========== -->
<!-- TEST_CASE: 三点式圆弧 -->
<foundation:Arc id="ARC_001" xsi:type="d2:EDMDArc">
  <!-- 起点（必需） -->
  <d2:StartPoint>PT_101</d2:StartPoint>
  <!-- 中间点（必需） -->
  <d2:MidPoint>PT_102</d2:MidPoint>
  <!-- 终点（必需） -->
  <d2:EndPoint>PT_103</d2:EndPoint>
</foundation:Arc>

<!-- =========== 3. 圆心式圆 (EDMDCircleCenter) =========== -->
<!-- TEST_CASE: 圆心+直径式圆 -->
<foundation:CircleCenter id="CIRCLE_CENTER_001" xsi:type="d2:EDMDCircleCenter">
  <!-- 圆心点（必需） -->
  <d2:CenterPoint>PT_201</d2:CenterPoint>
  <!-- 直径（必需） -->
  <d2:Diameter xsi:type="property:EDMDLengthProperty">
    <property:Value>3.000000</property:Value>
  </d2:Diameter>
</foundation:CircleCenter>

<!-- =========== 4. 三点式圆 (EDMDCircle3Point) =========== -->
<!-- TEST_CASE: 三点式圆 -->
<foundation:Circle3Point id="CIRCLE_3PT_001" xsi:type="d2:EDMDCircle3Point">
  <!-- 三个点（必需） -->
  <d2:Point1>PT_301</d2:Point1>
  <d2:Point2>PT_302</d2:Point2>
  <d2:Point3>PT_303</d2:Point3>
</foundation:Circle3Point>

<!-- =========== 5. 椭圆 (EDMDEllipse) =========== -->
<!-- TEST_CASE: 椭圆 -->
<foundation:Ellipse id="ELLIPSE_001" xsi:type="d2:EDMDEllipse">
  <!-- 中心点（必需） -->
  <d2:CenterPoint>PT_401</d2:CenterPoint>
  <!-- 长半轴长度（必需） -->
  <d2:SemiMajorAxis xsi:type="property:EDMDLengthProperty">
    <property:Value>5.000000</property:Value>
  </d2:SemiMajorAxis>
  <!-- 短半轴长度（必需） -->
  <d2:SemiMinorAxis xsi:type="property:EDMDLengthProperty">
    <property:Value>2.500000</property:Value>
  </d2:SemiMinorAxis>
</foundation:Ellipse>

<!-- =========== 6. B样条曲线 (EDMDBSplineCurve) =========== -->
<!-- TEST_CASE: B样条曲线 -->
<foundation:BSplineCurve id="BSPLINE_001" xsi:type="d2:EDMDBSplineCurve">
  <!-- 控制点序列（必需） -->
  <d2:ControlPoint>PT_501</d2:ControlPoint>
  <d2:ControlPoint>PT_502</d2:ControlPoint>
  <d2:ControlPoint>PT_503</d2:ControlPoint>
  <d2:ControlPoint>PT_504</d2:ControlPoint>
  <!-- 曲线阶数（必需） -->
  <d2:Degree>3</d2:Degree>
  <!-- 可选：是否闭合曲线 -->
  <d2:ClosedCurve>false</d2:ClosedCurve>
  <!-- 可选：是否自相交 -->
  <d2:SelfIntersect>false</d2:SelfIntersect>
  <!-- 可选：曲线形式 -->
  <d2:CurveForm>uniform</d2:CurveForm>
</foundation:BSplineCurve>

<!-- =========== 7. 复合曲线 (EDMDCompositeCurve) =========== -->
<!-- TEST_CASE: 复合曲线（组合多种曲线类型） -->
<foundation:CompositeCurve id="COMPOSITE_001" xsi:type="d2:EDMDCompositeCurve">
  <!-- 组成曲线的元素，引用其他几何元素的id（必需） -->
  <d2:CurveElement>POLYLINE_001</d2:CurveElement>
  <d2:CurveElement>ARC_001</d2:CurveElement>
  <d2:CurveElement>BSPLINE_001</d2:CurveElement>
</foundation:CompositeCurve>

<!-- =========== 8. 直线 (EDMDLine) =========== -->
<!-- TEST_CASE: 直线（主要用于弯曲区域轴线） -->
<foundation:Line id="LINE_BEND_001" xsi:type="d2:EDMDLine">
  <!-- 点（必需）：直线通过的点 -->
  <d2:Point>PT_601</d2:Point>
  <!-- 向量（必需）：方向向量 -->
  <d2:Vector>PT_VEC_001</d2:Vector>
</foundation:Line>
```

**注意事项**：

1. **点引用**：所有几何元素中的点必须引用已定义的`CartesianPoint`的ID
2. **2D几何**：所有几何元素都是二维的，Z轴范围由`CurveSet2D`的`LowerBound`/`UpperBound`定义
3. **闭合性**：
   - `PolyLine`通过重复第一个点实现闭合
   - `BSplineCurve`有明确的`ClosedCurve`属性
4. **厚度**：仅`PolyLine`支持`Thickness`属性，用于表示走线宽度或铣削路径
5. **曲线顺序**：`CompositeCurve`中的曲线按顺序连接
6. **直线用途**：`EDMDLine`主要用于弯曲区域的轴线定义，不是轮廓的一部分

**建模差异**：

- **无差异**：传统建模与优化建模在几何层完全一致
- **几何层独立**：几何元素的定义与上层结构无关，可被两种建模方式复用

**类型定义**：

```typescript
// ============= 几何描述类型 =============

/** 几何元素类型 */
export type EDMDGeometryType =
	| IDXD2Tag.EDMDPolyLine
	| IDXD2Tag.EDMDArc
	| IDXD2Tag.EDMDCircleCenter
	| IDXD2Tag.EDMDCircle3Point
	| IDXD2Tag.EDMDEllipse
	| IDXD2Tag.EDMDBSplineCurve
	| IDXD2Tag.EDMDCompositeCurve
	| IDXD2Tag.EDMDLine;

/** 几何元素基础类型(便于判断几何类型) */
export interface EDMDBaseGeometry extends EDMDObject {
	/** 几何类型 */
	type: EDMDGeometryType;
}

/**
 * 几何元素联合类型
 */
export type EDMDGeometry =
	| EDMDPolyLine
	| EDMDArc
	| EDMDCircleCenter
	| EDMDCircle3Point
	| EDMDEllipse
	| EDMDBSplineCurve
	| EDMDCompositeCurve
	| EDMDLine;

/**
 * 多段线几何元素
 *
 * @remarks
 * 由一系列点连接而成的折线，可闭合
 * REF: Section 7.1.7
 * XML: <foundation:PolyLine xsi:type="d2:EDMDPolyLine">
 */
export interface EDMDPolyLine extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDPolyLine;
	/** 点序列，引用 CartesianPoint 的 id */
	Points: string[];
	/** 可选厚度，用于表示走线或铣削路径的宽度 */
	Thickness?: EDMDLengthProperty;
}

/**
 * 圆弧几何元素
 *
 * @remarks
 * 由起点、中间点和终点定义的圆弧
 * REF: Section 7.1.1
 */
export interface EDMDArc extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDArc;
	/** 起点，引用 CartesianPoint 的 id */
	StartPoint: string;
	/** 中间点，引用 CartesianPoint 的 id */
	MidPoint: string;
	/** 终点，引用 CartesianPoint 的 id */
	EndPoint: string;
}

/**
 * 圆心式圆几何元素
 *
 * @remarks
 * 由圆心点和直径定义的圆
 * REF: Section 7.1.4
 */
export interface EDMDCircleCenter extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDCircleCenter;
	/** 圆心点，引用 CartesianPoint 的 id */
	CenterPoint: string;
	/** 直径 */
	Diameter: EDMDLengthProperty;
}

/**
 * 三点式圆几何元素
 *
 * @remarks
 * 由三个点定义的圆
 * REF: Section 7.1.3
 */
export interface EDMDCircle3Point extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDCircle3Point;
	/** 点1，引用 CartesianPoint 的 id */
	Point1: string;
	/** 点2，引用 CartesianPoint 的 id */
	Point2: string;
	/** 点3，引用 CartesianPoint 的 id */
	Point3: string;
}

/**
 * 椭圆几何元素
 *
 * @remarks
 * 由中心点和长短半轴定义的椭圆
 * REF: Section 7.1.5
 */
export interface EDMDEllipse extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDEllipse;
	/** 中心点，引用 CartesianPoint 的 id */
	CenterPoint: string;
	/** 长半轴长度 */
	SemiMajorAxis: EDMDLengthProperty;
	/** 短半轴长度 */
	SemiMinorAxis: EDMDLengthProperty;
}

/**
 * B样条曲线几何元素
 *
 * @remarks
 * 参数化曲线，通过控制点、阶数和节点向量定义
 * REF: Section 7.1.2
 */
export interface EDMDBSplineCurve extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDBSplineCurve;
	/** 控制点序列，引用 CartesianPoint 的 id */
	ControlPoints: string[];
	/** 曲线阶数 */
	Degree: number;
	/** 是否闭合曲线 */
	ClosedCurve?: boolean;
	/** 是否自相交 */
	SelfIntersect?: boolean;
	/** 曲线形式 */
	CurveForm?: string;
}

/**
 * 复合曲线几何元素
 *
 * @remarks
 * 由多条曲线组合而成的复杂曲线
 * REF: Section 7.1.8
 */
export interface EDMDCompositeCurve extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDCompositeCurve;
	/** 组成曲线的元素，引用其他几何元素的 id */
	Curves: string[];
}

/**
 * 直线几何元素
 *
 * @remarks
 * 由点和向量定义的无限长直线
 * REF: Section 6.1.2.4 (Bend Line)
 */
export interface EDMDLine extends EDMDBaseGeometry {
	type: IDXD2Tag.EDMDLine;
	/** 起点，引用 CartesianPoint 的 id */
	Point: string;
	/** 方向向量，引用 CartesianPoint 的 id */
	Vector: string;
}
```

#### **第3层：曲线集 (CurveSet2D)**

**完整示例**：

```xml
<!-- TEST_CASE: 基本曲线集定义 -->
<foundation:CurveSet2d id="CURVESET_001" xsi:type="d2:EDMDCurveSet2d">
  <!-- 形状描述类型（必需）：GeometricModel 或 DocumentationModel -->
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  
  <!-- Z轴下边界（必需）：定义曲线起始高度 -->
  <d2:LowerBound xsi:type="property:EDMDLengthProperty">
    <property:Value>0.000000</property:Value>
  </d2:LowerBound>
  
  <!-- Z轴上边界（必需）：定义曲线结束高度 -->
  <d2:UpperBound xsi:type="property:EDMDLengthProperty">
    <property:Value>1.600000</property:Value>
  </d2:UpperBound>
  
  <!-- 引用的几何元素（必需）：可以包含多个几何元素 -->
  <d2:DetailedGeometricModelElement>POLYLINE_001</d2:DetailedGeometricModelElement>
  <d2:DetailedGeometricModelElement>ARC_001</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<!-- TEST_CASE: 特殊用途曲线集 -->
<foundation:CurveSet2d id="CURVESET_HOLE_001" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  
  <!-- 特殊情况1：通孔（LowerBound=0, UpperBound=0 表示贯穿整个板厚） -->
  <d2:LowerBound xsi:type="property:EDMDLengthProperty">
    <property:Value>0.000000</property:Value>
  </d2:LowerBound>
  <d2:UpperBound xsi:type="property:EDMDLengthProperty">
    <property:Value>0.000000</property:Value>
  </d2:UpperBound>
  
  <!-- 只包含一个圆形几何元素表示孔 -->
  <d2:DetailedGeometricModelElement>CIRCLE_CENTER_001</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<!-- TEST_CASE: 多层板中的信号层曲线集 -->
<foundation:CurveSet2d id="CURVESET_SIGNAL_LAYER1" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  
  <!-- 在板层堆叠中的特定Z范围（相对于板底面） -->
  <d2:LowerBound xsi:type="property:EDMDLengthProperty">
    <property:Value>0.400000</property:Value>
  </d2:LowerBound>
  <d2:UpperBound xsi:type="property:EDMDLengthProperty">
    <property:Value>0.402000</property:Value>
    <!-- 信号层通常很薄（如0.002mm） -->
  </d2:UpperBound>
  
  <!-- 包含走线和焊盘几何 -->
  <d2:DetailedGeometricModelElement>POLYLINE_TRACE_001</d2:DetailedGeometricModelElement>
  <d2:DetailedGeometricModelElement>CIRCLE_CENTER_PAD1</d2:DetailedGeometricModelElement>
  <d2:DetailedGeometricModelElement>CIRCLE_CENTER_PAD2</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<!-- TEST_CASE: 表面贴装元件曲线集（无厚度） -->
<foundation:CurveSet2d id="CURVESET_SMD_PAD" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  
  <!-- 表面层：UpperBound=LowerBound 表示零厚度 -->
  <d2:LowerBound xsi:type="property:EDMDLengthProperty">
    <property:Value>1.600000</property:Value>
    <!-- 假设板厚1.6mm，元件在板顶面 -->
  </d2:LowerBound>
  <d2:UpperBound xsi:type="property:EDMDLengthProperty">
    <property:Value>1.600000</property:Value>
  </d2:UpperBound>
  
  <!-- 焊盘几何 -->
  <d2:DetailedGeometricModelElement>POLYLINE_PAD1</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>
```

**注意事项**：

1. **Z轴范围含义**：
   - `LowerBound`和`UpperBound`定义几何在Z轴的范围
   - 值为绝对坐标（相对于板底面Z=0）
   - 当`LowerBound=UpperBound`时表示零厚度平面元素

   更多Z轴计算逻辑可参考“曲线集上下边界计算逻辑”章节。
   
2. **通孔表示**：
   
   - 使用`LowerBound=0, UpperBound=0`表示贯穿整个板厚
   - 或者`LowerBound=0, UpperBound=板厚`（如1.6mm）也表示通孔
   
3. **几何元素组织**：
   - 一个`CurveSet2D`可以包含多个几何元素
   - 所有元素共享相同的Z轴范围
   - 几何元素应属于同一"层"或相同Z范围

4. **形状描述类型**：
   - `GeometricModel`：用于实际几何形状（板轮廓、元件等）
   - `DocumentationModel`：用于文档或注释（较少使用）

5. **引用完整性**：
   - `DetailedGeometricModelElement`必须引用已定义的几何元素ID
   - 确保所有引用的几何元素都已正确定义

6. **多层板设计**：
   - 每个物理层（信号层、阻焊层等）应有独立的`CurveSet2D`
   - Z轴范围需精确对应层在堆叠中的位置

**建模差异**：
- **无差异**：传统建模与优化建模在CurveSet2D层完全一致
- **通用结构**：CurveSet2D是纯几何容器，不涉及对象分类逻辑

**类型定义**：

```typescript
// ============= 2D曲线集 =============

/**
 * 2D曲线集
 *
 * @remarks
 * 定义几何元素的Z轴范围，实现2.5D表示
 * REF: Section 7.1
 * XML: <foundation:CurveSet2d xsi:type="d2:EDMDCurveSet2d">
 */
export interface EDMDCurveSet2D extends EDMDObject, EDMDZBounds {
	/** 形状描述类型 */
	ShapeDescriptionType: CurveSet2DShapeDescType;
	/** 引用的几何元素id列表 */
	DetailedGeometricModelElements: string[];
}

/** 2D曲线集形状描述类型 */
export enum CurveSet2DShapeDescType {
	/** 几何模型（常用） */
	GeometricModel = 'GeometricModel',
	/** 文档模型 */
	DocumentationModel = 'DocumentationModel',
}

/**Z轴边界（坐标）  */
export interface EDMDZBounds {
	/** Z轴下边界，定义曲线起始高度 */
	LowerBound: EDMDLengthProperty;
	/** Z轴上边界，定义曲线结束高度 */
	UpperBound: EDMDLengthProperty;
}
```

#### **第4层：形状元素 (ShapeElement)**

**完整示例**：

```xml
<!-- =========== 1. 基本形状元素（添加材料）=========== -->
<!-- TEST_CASE: 特征形状元素（用于板轮廓、元件等） -->
<foundation:ShapeElement id="SHAPE_BOARD_OUTLINE" xsi:type="pdm:EDMDShapeElement">
  <!-- 形状元素类型（必需） -->
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  
  <!-- 布尔运算标记（必需）：false=添加材料，true=减去材料 -->
  <pdm:Inverted>false</pdm:Inverted>
  
  <!-- 引用的曲线集ID（必需） -->
  <pdm:DefiningShape>CURVESET_BOARD_OUTLINE</pdm:DefiningShape>
  
  <!-- 可选：用户属性 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>LAYER</foundation:ObjectName>
    </property:Key>
    <property:Value>TOP</property:Value>
  </foundation:UserProperty>
</foundation:ShapeElement>

<!-- =========== 2. 切割形状元素（布尔减运算）=========== -->
<!-- TEST_CASE: 用于切割孔、槽等 -->
<foundation:ShapeElement id="SHAPE_MOUNTING_HOLE" xsi:type="pdm:EDMDShapeElement">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  
  <!-- Inverted=true 表示从主体中减去此形状 -->
  <pdm:Inverted>true</pdm:Inverted>
  
  <pdm:DefiningShape>CURVESET_HOLE_3MM</pdm:DefiningShape>
</foundation:ShapeElement>

<!-- =========== 3. 安装特征形状元素=========== -->
<!-- TEST_CASE: 用于非电镀孔等安装特征 -->
<foundation:ShapeElement id="SHAPE_MOUNTING_FEATURE" xsi:type="pdm:EDMDShapeElement">
  <!-- PartMountingFeature 用于安装孔特征 -->
  <pdm:ShapeElementType>PartMountingFeature</pdm:ShapeElementType>
  <pdm:Inverted>false</pdm:Inverted>
  <pdm:DefiningShape>CURVESET_NPTH_2MM</pdm:DefiningShape>
</foundation:ShapeElement>

<!-- =========== 4. 非特征形状元素=========== -->
<!-- TEST_CASE: 用于弯曲区域、参考几何等 -->
<foundation:ShapeElement id="SHAPE_BEND_AREA" xsi:type="pdm:EDMDShapeElement">
  <!-- NonFeatureShapeElement 用于辅助几何 -->
  <pdm:ShapeElementType>NonFeatureShapeElement</pdm:ShapeElementType>
  <pdm:Inverted>false</pdm:Inverted>
  <pdm:DefiningShape>CURVESET_BEND_ZONE</pdm:DefiningShape>
</foundation:ShapeElement>

<!-- =========== 5. 复合形状元素（多曲线集）=========== -->
<!-- TEST_CASE: 包含多个曲线集的复杂形状 -->
<foundation:ShapeElement id="SHAPE_COMPLEX_CUTOUT" xsi:type="pdm:EDMDShapeElement">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:Inverted>true</pdm:Inverted>
  <!-- 复合形状需要引用复合曲线集 -->
  <pdm:DefiningShape>CURVESET_COMPOSITE_CUTOUT</pdm:DefiningShape>
</foundation:ShapeElement>
```

**注意事项**：

1. **布尔运算规则**：
   - `Inverted=false`：添加材料（OR操作）
   - `Inverted=true`：减去材料（NAND操作）
   - 所有形状元素按`XML`顺序应用布尔运算

2. **形状元素类型选择**：

| ShapeElementType           | 用途         | 常见场景                     |
| -------------------------- | ------------ | ---------------------------- |
| **FeatureShapeElement**    | 通用特征形状 | 板轮廓、元件、孔、禁止区域   |
| **PartMountingFeature**    | 安装特征     | 非电镀安装孔、机械安装点     |
| **NonFeatureShapeElement** | 非特征几何   | 弯曲区域、参考区域、辅助几何 |
| **PartFeature**            | 元件特征     | 元件本体（传统方法）         |
| **ViaTerminal**            | 过孔端子     | 过孔焊盘                     |

3. **引用完整性**：
   - `DefiningShape`必须引用已定义的`CurveSet2D`的ID
   - 确保被引用的曲线集包含正确的几何元素

4. **多层板设计**：
   - 不同板层上的形状元素应使用不同的`CurveSet2D`
   - 通过Z轴范围区分各层的形状元素

5. **布尔运算顺序**：
   - XML文档中的顺序决定布尔运算顺序
   - 先添加主体，再减去切割特征

**建模差异**：

| 对比维度                 | 传统建模                          | 优化建模（IDXv4.0+）                    |
| ------------------------ | --------------------------------- | --------------------------------------- |
| **ShapeElementType使用** | 更多依赖特定类型（如PartFeature） | 主要使用通用类型（FeatureShapeElement） |
| **类型映射**             | 需要与上层对象类型匹配（Table 2） | 简化，主要通过geometryType属性识别      |
| **复杂度**               | 类型较多，需要精确匹配            | 类型较少，通用性更强                    |

**类型定义**：

```typescript
/**
 * 形状元素类型枚举
 *
 * @remarks
 * 根据IDX规范Table 2和实际使用情况定义
 */
export type ShapeElementType = 
  | 'FeatureShapeElement'      // 通用特征形状
  | 'PartMountingFeature'      // 安装特征
  | 'NonFeatureShapeElement'   // 非特征几何
  | 'PartFeature'              // 元件特征（传统方法）
  | 'ComponentTerminal'        // 元件端子
  | 'ViaTerminal'              // 过孔端子
  | 'FeatureShapeElement'      // 特征形状元素（最常用）
  | 'PartMountingFeature'      // 部件安装特征
  | 'NonFeatureShapeElement'   // 非特征形状元素
  | 'ComponentTerminal';       // 元件端子

/**
 * 形状元素
 *
 * @remarks
 * 连接曲线集和项目定义的中介，支持布尔运算
 * REF: Section 4.1.2 (Table 2)
 * XML: <foundation:ShapeElement xsi:type="pdm:EDMDShapeElement">
 */
export interface EDMDShapeElement extends EDMDObject {
  /** XML类型标识 */
  'xsi:type': 'pdm:EDMDShapeElement';
  /** 形状元素类型 */
  ShapeElementType: ShapeElementType;
  /** 布尔运算标记：false=添加材料，true=减去材料 */
  Inverted: boolean;
  /** 引用的曲线集id */
  DefiningShape: string;
  /** 可选用户属性 */
  UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 特殊形状元素：添加材料的形状
 */
export interface PositiveShapeElement extends EDMDShapeElement {
  Inverted: false;
}

/**
 * 特殊形状元素：减去材料的形状（切割）
 */
export interface NegativeShapeElement extends EDMDShapeElement {
  Inverted: true;
}

/**
 * 复合形状元素（包含多个子形状）
 *
 * @remarks
 * 用于表示需要多个布尔操作组合的复杂形状
 */
export interface CompositeShapeElement extends EDMDObject {
  /** 主形状元素ID */
  MainShape: string;
  /** 切割形状元素ID数组（Inverted=true） */
  CutoutShapes: string[];
  /** 附加形状元素ID数组（Inverted=false） */
  AdditionalShapes: string[];
}

/**
 * 形状元素管理器
 *
 * @remarks
 * 用于管理IDX文件中的形状元素定义
 */
export interface ShapeElementManager {
  /** 添加形状元素 */
  addShapeElement(shape: EDMDShapeElement): boolean;
  
  /** 根据类型获取形状元素 */
  getShapeElementsByType(type: ShapeElementType): EDMDShapeElement[];
  
  /** 获取引用特定曲线集的形状元素 */
  getShapeElementsByCurveSet(curveSetId: string): EDMDShapeElement[];
  
  /** 获取所有切割形状（Inverted=true） */
  getCutoutShapes(): NegativeShapeElement[];
  
  /** 获取所有添加形状（Inverted=false） */
  getPositiveShapes(): PositiveShapeElement[];
}
```

#### **第5层：传统方式建模的Third Item层次**

**完整示例**：

```xml
<!-- =========== 1. 板框 (BOARD_OUTLINE) =========== -->
<!-- TEST_CASE: 传统方式 - 板框定义 -->
<foundation:Stratum id="STRATUM_BOARD" xsi:type="pdm:EDMDStratum">
  <!-- 引用的形状元素列表（必需） -->
  <pdm:ShapeElement>SHAPE_BOARD_OUTER</pdm:ShapeElement>
  <!-- 可选：切割孔等 -->
  <pdm:ShapeElement>SHAPE_CUTOUT_1</pdm:ShapeElement>
  <pdm:ShapeElement>SHAPE_CUTOUT_2</pdm:ShapeElement>
  
  <!-- 层类型（必需）：DesignLayerStratum 表示物理设计层 -->
  <pdm:StratumType>DesignLayerStratum</pdm:StratumType>
  
  <!-- 层表面指定（可选）：PrimarySurface 表示主表面（板顶面） -->
  <pdm:StratumSurfaceDesignation>PrimarySurface</pdm:StratumSurfaceDesignation>
  
  <!-- 层技术引用（可选）：用于定义层的特殊属性 -->
  <pdm:StratumTechnology>STRATUM_TECH_BOARD</pdm:StratumTechnology>
</foundation:Stratum>

<!-- =========== 2. 组件 (COMPONENT) =========== -->
<!-- TEST_CASE: 传统方式 - 组件定义 -->
<foundation:AssemblyComponent id="ASSEMBLY_COMP_001" xsi:type="pdm:EDMDAssemblyComponent">
  <!-- 引用的形状元素（必需） -->
  <pdm:ShapeElement>SHAPE_COMP_BODY</pdm:ShapeElement>
  
  <!-- 组件类型（必需）：Physical 表示电气组件，MechanicalItem 表示机械组件 -->
  <pdm:AssemblyComponentType>Physical</pdm:AssemblyComponentType>
  
  <!-- 可选：用户属性 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>REFDES</foundation:ObjectName>
    </property:Key>
    <property:Value>R1</property:Value>
  </foundation:UserProperty>
</foundation:AssemblyComponent>

<!-- =========== 3. 孔 (HOLE) =========== -->
<!-- TEST_CASE: 传统方式 - 电镀孔定义 -->
<foundation:InterStratumFeature id="ISF_PLATED_HOLE_001" xsi:type="pdm:EDMDInterStratumFeature">
  <!-- 引用的形状元素（必需） -->
  <pdm:ShapeElement>SHAPE_HOLE_CIRCLE</pdm:ShapeElement>
  
  <!-- 跨层特征类型（必需）：PlatedCutout 表示电镀孔，Cutout 表示非电镀孔 -->
  <pdm:InterStratumFeatureType>PlatedCutout</pdm:InterStratumFeatureType>
  
  <!-- 关联的层（必需）：孔所跨越的层 -->
  <pdm:Stratum>STRATUM_BOARD</pdm:Stratum>
  
  <!-- 可选：孔径公差等属性 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>MCADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>TOLERANCE</foundation:ObjectName>
    </property:Key>
    <property:Value>±0.05</property:Value>
  </foundation:UserProperty>
</foundation:InterStratumFeature>

<!-- =========== 4. 禁布区 (KEEPOUT) =========== -->
<!-- TEST_CASE: 传统方式 - 布线禁布区定义 -->
<foundation:KeepOut id="KEEPOUT_ROUTE_001" xsi:type="pdm:EDMDKeepOut">
  <!-- 引用的形状元素（必需） -->
  <pdm:ShapeElement>SHAPE_ROUTE_KEEPOUT</pdm:ShapeElement>
  
  <!-- 禁布目的（必需）：Route 表示布线禁布，ComponentPlacement 表示元件放置禁布等 -->
  <pdm:Purpose>Route</pdm:Purpose>
  
  <!-- 可选：禁布优先级 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>PRIORITY</foundation:ObjectName>
    </property:Key>
    <property:Value>High</property:Value>
  </foundation:UserProperty>
</foundation:KeepOut>

<!-- =========== 5. 保留区 (KEEPIN) =========== -->
<!-- TEST_CASE: 传统方式 - 元件放置保留区定义 -->
<foundation:KeepIn id="KEEPIN_COMP_001" xsi:type="pdm:EDMDKeepIn">
  <!-- 引用的形状元素（必需） -->
  <pdm:ShapeElement>SHAPE_COMP_KEEPIN</pdm:ShapeElement>
  
  <!-- 保留目的（必需）：ComponentPlacement 表示元件放置保留 -->
  <pdm:Purpose>ComponentPlacement</pdm:Purpose>
  
  <!-- 可选：最大元件高度限制 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>MCADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>MAX_HEIGHT</foundation:ObjectName>
    </property:Key>
    <property:Value>5.0</property:Value>
  </foundation:UserProperty>
</foundation:KeepIn>

<!-- =========== 6. 其他区域/功能区 (OTHER_OUTLINE) =========== -->
<!-- TEST_CASE: 传统方式 - 用户自定义区域 -->
<foundation:FunctionalItemShape id="FUNC_USER_AREA_001" xsi:type="pdm:EDMDFunctionalItemShape">
  <!-- 引用的形状元素（必需） -->
  <pdm:ShapeElement>SHAPE_USER_AREA</pdm:ShapeElement>
  
  <!-- 功能类型（必需）：UserArea 表示用户自定义区域 -->
  <pdm:FunctionalItemShapeType>UserArea</pdm:FunctionalItemShapeType>
  
  <!-- 可选：区域名称 -->
  <foundation:Name>Logo Placement Area</foundation:Name>
  
  <!-- 可选：关联的ECAD层 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>ECAD_LAYER</foundation:ObjectName>
    </property:Key>
    <property:Value>ETCH_TOP</property:Value>
  </foundation:UserProperty>
</foundation:FunctionalItemShape>

<!-- =========== 7. 弯曲区域 (BEND_AREA) =========== -->
<!-- TEST_CASE: 传统方式 - 柔性板弯曲区域 -->
<foundation:FunctionalItemShape id="FUNC_FLEX_AREA_001" xsi:type="pdm:EDMDFunctionalItemShape">
  <pdm:ShapeElement>SHAPE_FLEX_AREA</pdm:ShapeElement>
  
  <!-- 功能类型：FlexibleArea 表示柔性区域 -->
  <pdm:FunctionalItemShapeType>FlexibleArea</pdm:FunctionalItemShapeType>
  
  <!-- 可选：弯曲半径限制 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>MCADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>MIN_BEND_RADIUS</foundation:ObjectName>
    </property:Key>
    <property:Value>2.0</property:Value>
  </foundation:UserProperty>
</foundation:FunctionalItemShape>

<!-- =========== 8. 放置组区域 (PLACEMENT_GROUP) =========== -->
<!-- TEST_CASE: 传统方式 - 元件放置组 -->
<foundation:FunctionalItemShape id="FUNC_PLACEMENT_GROUP_001" xsi:type="pdm:EDMDFunctionalItemShape">
  <pdm:ShapeElement>SHAPE_PLACEMENT_GROUP</pdm:ShapeElement>
  
  <!-- 功能类型：PlacementGroupArea 表示元件放置组区域 -->
  <pdm:FunctionalItemShapeType>PlacementGroupArea</pdm:FunctionalItemShapeType>
  
  <foundation:Name>Power Section</foundation:Name>
  <foundation:Description>Power management components group</foundation:Description>
</foundation:FunctionalItemShape>

<!-- =========== 9. 物理层 (LAYER) =========== -->
<!-- TEST_CASE: 传统方式 - 信号层定义 -->
<foundation:Stratum id="STRATUM_SIGNAL_LAYER1" xsi:type="pdm:EDMDStratum">
  <pdm:ShapeElement>SHAPE_SIGNAL_TRACES</pdm:ShapeElement>
  <pdm:StratumType>DesignLayerStratum</pdm:StratumType>
  
  <!-- 层技术定义（可选但推荐） -->
  <pdm:StratumTechnology>STRATUM_TECH_SIGNAL</pdm:StratumTechnology>
</foundation:Stratum>

<!-- 层技术定义 -->
<foundation:StratumTechnology id="STRATUM_TECH_SIGNAL" xsi:type="pdm:EDMDStratumTechnology">
  <!-- 技术类型：Design 表示设计层，Documentation 表示文档层 -->
  <pdm:TechnologyType>Design</pdm:TechnologyType>
  
  <!-- 层用途：OtherSignal 表示信号层 -->
  <pdm:LayerPurpose>OtherSignal</pdm:LayerPurpose>
  
  <!-- 可选：层材料属性 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>MCADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>MATERIAL</foundation:ObjectName>
    </property:Key>
    <property:Value>Copper</property:Value>
  </foundation:UserProperty>
</foundation:StratumTechnology>

<!-- =========== 10. 铣削切割 (MILLED_CUTOUT) =========== -->
<!-- TEST_CASE: 传统方式 - 铣削切割定义 -->
<foundation:InterStratumFeature id="ISF_MILLED_CUT_001" xsi:type="pdm:EDMDInterStratumFeature">
  <pdm:ShapeElement>SHAPE_MILLED_PATH</pdm:ShapeElement>
  
  <!-- 跨层特征类型：MilledCutout 表示非电镀铣削切割 -->
  <pdm:InterStratumFeatureType>MilledCutout</pdm:InterStratumFeatureType>
  
  <pdm:Stratum>STRATUM_BOARD</pdm:Stratum>
  
  <!-- 可选：铣削刀具直径 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>MCADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>TOOL_DIAMETER</foundation:ObjectName>
    </property:Key>
    <property:Value>2.0</property:Value>
  </foundation:UserProperty>
</foundation:InterStratumFeature>
```

**注意事项**：

1. **对象选择**：根据geometryType选择正确的`Third Item`对象：
   - `BOARD_OUTLINE` → `EDMDStratum`
   - `COMPONENT` → `EDMDAssemblyComponent`
   - `HOLE_*` → `EDMDInterStratumFeature`
   - `KEEPOUT_*` → `EDMDKeepOut`
   - `KEEPIN_*` → `EDMDKeepIn`
   - `OTHER_OUTLINE` → `EDMDFunctionalItemShape` (UserArea)
   - `LAYER_*` → `EDMDStratum` + `EDMDStratumTechnology`

2. **属性匹配**：确保`Third Item`的属性与`geometryType`一致：
   - 孔的`InterStratumFeatureType`需匹配孔类型
   - 禁布区的`Purpose`需匹配禁布类型
   - 功能区的`FunctionalItemShapeType`需匹配区域类型

3. **层技术**：对于物理层，使用`EDMDStratumTechnology`定义层属性
4. **引用完整性**：Third Item必须引用正确的`ShapeElement`

**类型定义**：

```typescript
// ============= 传统方式建模的类型定义 =============
/**
 * 传统方式Third Item联合类型
 */
export type EDMDThirdItem = 
  | EDMDStratum
  | EDMDAssemblyComponent
  | EDMDInterStratumFeature
  | EDMDKeepOut
  | EDMDKeepIn
  | EDMDFunctionalItemShape;

/** 层类型枚举 */
export enum StratumType {
  /** 设计层（物理层） */
  DesignLayerStratum = 'DesignLayerStratum',
  /** 文档层（非物理层） */
  DocumentationLayerStratum = 'DocumentationLayerStratum',
}

/** 层表面指定枚举 */
export enum StratumSurfaceDesignation {
  /** 主表面（通常为板顶面或底面） */
  PrimarySurface = 'PrimarySurface',
  /** 次表面 */
  SecondarySurface = 'SecondarySurface',
}

/** 技术类型枚举 */
export enum TechnologyType {
  /** 设计技术 */
  Design = 'Design',
  /** 文档技术 */
  Documentation = 'Documentation',
}

/** 层用途枚举 */
export enum LayerPurpose {
  /** 信号层 */
  OtherSignal = 'OtherSignal',
  /** 电源/地层 */
  PowerOrGround = 'PowerOrGround',
  /** 阻焊层 */
  SolderMask = 'SolderMask',
  /** 丝印层 */
  SilkScreen = 'SilkScreen',
  /** 焊盘层 */
  LandsOnly = 'LandsOnly',
  /** 锡膏层 */
  SolderPaste = 'SolderPaste',
  /** 粘合剂层 */
  Glue = 'Glue',
  /** 通用层 */
  GenericLayer = 'GenericLayer',
  /** 嵌入式电容介质层 */
  EmbeddedPassiveCapacitorDielectric = 'EmbeddedPassiveCapacitorDielectric',
  /** 嵌入式电阻层 */
  EmbeddedPassiveResistor = 'EmbeddedPassiveResistor',
}

/** 跨层特征类型枚举 */
export enum InterStratumFeatureType {
  /** 非电镀孔 */
  Cutout = 'Cutout',
  /** 电镀孔 */
  PlatedCutout = 'PlatedCutout',
  /** 铣削切割 */
  MilledCutout = 'MilledCutout',
  /** 部分电镀孔 */
  PartiallyPlatedCutout = 'PartiallyPlatedCutout',
  /** 过孔 */
  Via = 'Via',
  /** 填充过孔 */
  FilledVia = 'FilledVia',
  /** 板切割 */
  BoardCutout = 'BoardCutout',
}

/** 禁布/保留目的枚举 */
export enum KeepConstraintPurpose {
  /** 布线禁布/保留 */
  Route = 'Route',
  /** 元件放置禁布/保留 */
  ComponentPlacement = 'ComponentPlacement',
  /** 过孔禁布/保留 */
  Via = 'Via',
  /** 测试点禁布/保留 */
  TestPoint = 'TestPoint',
  /** 热相关禁布/保留 */
  Thermal = 'Thermal',
  /** 通用间距 */
  GenericClearance = 'GenericClearance',
  /** 振动相关 */
  Vibration = 'Vibration',
  /** 电磁兼容相关 */
  ElectromagneticCompatibility = 'ElectromagneticCompatibility',
  /** 其他 */
  Other = 'Other',
}

/** 功能区类型枚举 */
export enum FunctionalItemShapeType {
  /** 用户自定义区域 */
  UserArea = 'UserArea',
  /** 元件放置组区域 */
  PlacementGroupArea = 'PlacementGroupArea',
  /** 柔性区域 */
  FlexibleArea = 'FlexibleArea',
  /** 加强区域 */
  Stiffener = 'Stiffener',
  /** 机械组件 */
  MechanicalItem = 'MechanicalItem',
}

/** 组件类型枚举 */
export enum AssemblyComponentType {
  /** 电气组件 */
  Physical = 'Physical',
  /** 机械组件 */
  MechanicalItem = 'MechanicalItem',
  /** 装配组组件 */
  AssemblyGroupComponent = 'AssemblyGroupComponent',
  /** 层压组件 */
  LaminateComponent = 'LaminateComponent',
  /** 热组件 */
  ThermalComponent = 'ThermalComponent',
  /** 焊盘堆栈 */
  Padstack = 'Padstack',
}

/**
 * 层技术定义
 *
 * @remarks
 * 用于定义层的技术属性
 * REF: Section 6.1.2.3
 */
export interface EDMDStratumTechnology extends EDMDObject {
  /** 技术类型 */
  TechnologyType: TechnologyType;
  /** 层用途 */
  LayerPurpose: LayerPurpose;
  /** 可选用户属性 */
  UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 层定义（传统方式）
 *
 * @remarks
 * 在传统IDX结构中用作"Third Item"，在简化方式中可省略
 * REF: Section 6.1.2.1
 */
export interface EDMDStratum extends EDMDObject {
  /** 引用的形状元素id列表 */
  ShapeElements: string[];
  /** 层类型 */
  StratumType: StratumType;
  /** 层表面指定 */
  StratumSurfaceDesignation?: StratumSurfaceDesignation;
  /** 层技术引用 */
  StratumTechnology?: string;
}

/**
 * 组件定义（传统方式）
 *
 * @remarks
 * 用于定义电气或机械组件
 * REF: Section 6.2.1.1
 */
export interface EDMDAssemblyComponent extends EDMDObject {
  /** 引用的形状元素 */
  ShapeElement: string;
  /** 组件类型 */
  AssemblyComponentType: AssemblyComponentType;
  /** 可选用户属性 */
  UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 跨层特征定义（传统方式）
 *
 * @remarks
 * 用于定义孔、过孔等跨层特征
 * REF: Section 6.3.1
 */
export interface EDMDInterStratumFeature extends EDMDObject {
  /** 引用的形状元素 */
  ShapeElement: string;
  /** 跨层特征类型 */
  InterStratumFeatureType: InterStratumFeatureType;
  /** 关联的层 */
  Stratum: string;
  /** 可选用户属性 */
  UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 禁布区定义（传统方式）
 *
 * @remarks
 * 用于定义禁止区域
 * REF: Section 6.5.1.1
 */
export interface EDMDKeepOut extends EDMDObject {
  /** 引用的形状元素 */
  ShapeElement: string;
  /** 禁布目的 */
  Purpose: KeepConstraintPurpose;
  /** 可选用户属性 */
  UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 保留区定义（传统方式）
 *
 * @remarks
 * 用于定义保留区域
 * REF: Section 6.5.1.1
 */
export interface EDMDKeepIn extends EDMDObject {
  /** 引用的形状元素 */
  ShapeElement: string;
  /** 保留目的 */
  Purpose: KeepConstraintPurpose;
  /** 可选用户属性 */
  UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 功能区定义（传统方式）
 *
 * @remarks
 * 用于定义用户区域、放置组、柔性区域等功能区
 * REF: Section 6.6.1.1, 6.7.1.1
 */
export interface EDMDFunctionalItemShape extends EDMDObject {
  /** 引用的形状元素 */
  ShapeElement: string;
  /** 功能区类型 */
  FunctionalItemShapeType: FunctionalItemShapeType;
  /** 可选用户属性 */
  UserProperties?: EDMDUserSimpleProperty[];
}
```

#### **第6层：物理层和层堆叠 (Layers and Layer Stackups)**

**完整示例**：

```xml
<!-- =========== 1. 简化方式 - 物理层定义 =========== -->
<!-- TEST_CASE: 简化方式 - 信号层定义 -->
<foundation:Item id="ITEM_LAYER_SIGNAL_1" geometryType="LAYER_OTHERSIGNAL" IsAttributeChanged="false">
  <foundation:Name>Signal Layer 1</foundation:Name>
  <foundation:Description>Inner signal layer for routing</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  
  <!-- 形状引用：可以引用走线、焊盘等形状 -->
  <pdm:Shape>SHAPE_SIGNAL_TRACES_LAYER1</pdm:Shape>
  
  <!-- 参考名称：被层堆叠引用 -->
  <pdm:ReferenceName>SIGNAL_LAYER_1</pdm:ReferenceName>
  
  <!-- 可选：定义层在堆叠中的Z轴位置 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>UpperBound</foundation:ObjectName>
    </property:Key>
    <property:Value>0.600000</property:Value>
  </foundation:UserProperty>
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>LowerBound</foundation:ObjectName>
    </property:Key>
    <property:Value>0.598000</property:Value>
  </foundation:UserProperty>
</foundation:Item>

<!-- TEST_CASE: 简化方式 - 介质层定义 -->
<foundation:Item id="ITEM_LAYER_DIELECTRIC_1" geometryType="LAYER_DIELECTRIC" IsAttributeChanged="false">
  <foundation:Name>Dielectric Layer 1</foundation:Name>
  <foundation:Description>FR4 dielectric material</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>SHAPE_DIELECTRIC_AREA</pdm:Shape>
  <pdm:ReferenceName>DIELECTRIC_LAYER_1</pdm:ReferenceName>
  
  <!-- 介质层属性 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>MATERIAL</foundation:ObjectName>
    </property:Key>
    <property:Value>FR4</property:Value>
  </foundation:UserProperty>
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>DIELECTRIC_CONSTANT</foundation:ObjectName>
    </property:Key>
    <property:Value>4.5</property:Value>
  </foundation:UserProperty>
</foundation:Item>

<!-- TEST_CASE: 简化方式 - 阻焊层定义 -->
<foundation:Item id="ITEM_LAYER_SOLDERMASK_TOP" geometryType="LAYER_SOLDERMASK" IsAttributeChanged="false">
  <foundation:Name>Top Solder Mask</foundation:Name>
  <foundation:Description>Solder mask on top side</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>SHAPE_SOLDERMASK_TOP</pdm:Shape>
  <pdm:ReferenceName>TOP_SOLDERMASK</pdm:ReferenceName>
</foundation:Item>

<!-- TEST_CASE: 简化方式 - 丝印层定义 -->
<foundation:Item id="ITEM_LAYER_SILKSCREEN_TOP" geometryType="LAYER_SILKSCREEN" IsAttributeChanged="false">
  <foundation:Name>Top Silkscreen</foundation:Name>
  <foundation:Description>Silkscreen printing on top side</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>SHAPE_SILKSCREEN_TOP</pdm:Shape>
  <pdm:ReferenceName>TOP_SILKSCREEN</pdm:ReferenceName>
</foundation:Item>

<!-- =========== 2. 简化方式 - 层堆叠定义 =========== -->
<!-- TEST_CASE: 简化方式 - 层堆叠装配 -->
<foundation:Item id="ITEM_STACKUP_MAIN" geometryType="LAYER_STACKUP" IsAttributeChanged="false">
  <foundation:Name>Main Layer Stackup</foundation:Name>
  <foundation:Description>4-layer PCB stackup</foundation:Description>
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 参考名称：被板区域引用 -->
  <pdm:ReferenceName>MAIN_STACKUP</pdm:ReferenceName>
  
  <!-- 层实例：按堆叠顺序从下到上 -->
  
  <!-- 底层阻焊 -->
  <pdm:ItemInstance id="ITEMINST_BOTTOM_SOLDERMASK">
    <pdm:Item>ITEM_LAYER_SOLDERMASK_BOTTOM</pdm:Item>
    <pdm:InstanceName>Bottom_SolderMask</pdm:InstanceName>
    <!-- Z轴范围定义 -->
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>UpperBound</foundation:ObjectName>
      </property:Key>
      <property:Value>0.000000</property:Value>
    </foundation:UserProperty>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>LowerBound</foundation:ObjectName>
      </property:Key>
      <property:Value>-0.010000</property:Value>
    </foundation:UserProperty>
  </pdm:ItemInstance>
  
  <!-- 底层丝印 -->
  <pdm:ItemInstance id="ITEMINST_BOTTOM_SILKSCREEN">
    <pdm:Item>ITEM_LAYER_SILKSCREEN_BOTTOM</pdm:Item>
    <pdm:InstanceName>Bottom_Silkscreen</pdm:InstanceName>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>UpperBound</foundation:ObjectName>
      </property:Key>
      <property:Value>-0.010000</property:Value>
    </foundation:UserProperty>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>LowerBound</foundation:ObjectName>
      </property:Key>
      <property:Value>-0.015000</property:Value>
    </foundation:UserProperty>
  </pdm:ItemInstance>
  
  <!-- 底层铜层 -->
  <pdm:ItemInstance id="ITEMINST_BOTTOM_COPPER">
    <pdm:Item>ITEM_LAYER_SIGNAL_BOTTOM</pdm:Item>
    <pdm:InstanceName>Bottom_Copper</pdm:InstanceName>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>UpperBound</foundation:ObjectName>
      </property:Key>
      <property:Value>0.035000</property:Value>
    </foundation:UserProperty>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>LowerBound</foundation:ObjectName>
      </property:Key>
      <property:Value>0.000000</property:Value>
    </foundation:UserProperty>
  </pdm:ItemInstance>
  
  <!-- 介质层1 -->
  <pdm:ItemInstance id="ITEMINST_DIELECTRIC_1">
    <pdm:Item>ITEM_LAYER_DIELECTRIC_1</pdm:Item>
    <pdm:InstanceName>Dielectric_1</pdm:InstanceName>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>UpperBound</foundation:ObjectName>
      </property:Key>
      <property:Value>0.600000</property:Value>
    </foundation:UserProperty>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>LowerBound</foundation:ObjectName>
      </property:Key>
      <property:Value>0.035000</property:Value>
    </foundation:UserProperty>
  </pdm:ItemInstance>
  
  <!-- 继续添加更多层... -->
</foundation:Item>

<!-- =========== 3. 传统方式 - 层技术定义 =========== -->
<!-- TEST_CASE: 传统方式 - 层技术对象 -->
<foundation:StratumTechnology id="STRATUM_TECH_SIGNAL" xsi:type="pdm:EDMDStratumTechnology">
  <!-- 技术类型：Design表示设计层，Documentation表示文档层 -->
  <pdm:TechnologyType>Design</pdm:TechnologyType>
  
  <!-- 层用途：定义层的功能 -->
  <pdm:LayerPurpose>OtherSignal</pdm:LayerPurpose>
  
  <!-- 可选：层属性 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>THICKNESS</foundation:ObjectName>
    </property:Key>
    <property:Value>0.035</property:Value>
  </foundation:UserProperty>
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>MATERIAL</foundation:ObjectName>
    </property:Key>
    <property:Value>Copper</property:Value>
  </foundation:UserProperty>
</foundation:StratumTechnology>

<!-- =========== 4. 传统方式 - 层定义 =========== -->
<!-- TEST_CASE: 传统方式 - 信号层Stratum对象 -->
<foundation:Stratum id="STRATUM_SIGNAL_LAYER1" xsi:type="pdm:EDMDStratum">
  <!-- 形状元素：该层上的走线、焊盘等 -->
  <pdm:ShapeElement>SHAPE_SIGNAL_TRACES_LAYER1</pdm:ShapeElement>
  <pdm:ShapeElement>SHAPE_SIGNAL_PADS_LAYER1</pdm:ShapeElement>
  
  <!-- 层类型 -->
  <pdm:StratumType>DesignLayerStratum</pdm:StratumType>
  
  <!-- 层技术引用 -->
  <pdm:StratumTechnology>STRATUM_TECH_SIGNAL</pdm:StratumTechnology>
</foundation:Stratum>

<!-- =========== 5. 刚柔结合板的多堆叠示例 =========== -->
<!-- TEST_CASE: 简化方式 - 多个层堆叠用于刚柔结合板 -->
<foundation:Item id="ITEM_STACKUP_RIGID_AREA" geometryType="LAYER_STACKUP" IsAttributeChanged="false">
  <foundation:Name>Rigid Area Stackup</foundation:Name>
  <foundation:Description>Stackup for rigid areas of flex-rigid board</foundation:Description>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ReferenceName>RIGID_STACKUP</pdm:ReferenceName>
  <!-- 刚性区层实例 -->
</foundation:Item>

<foundation:Item id="ITEM_STACKUP_FLEX_AREA" geometryType="LAYER_STACKUP" IsAttributeChanged="false">
  <foundation:Name>Flex Area Stackup</foundation:Name>
  <foundation:Description>Stackup for flexible areas of flex-rigid board</foundation:Description>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ReferenceName>FLEX_STACKUP</pdm:ReferenceName>
  <!-- 柔性区层实例（层数较少） -->
</foundation:Item>

<!-- =========== 6. 板区域引用层堆叠 =========== -->
<!-- TEST_CASE: 板区域引用特定的层堆叠 -->
<foundation:Item id="ITEM_BOARD_AREA_RIGID" geometryType="BOARD_AREA_RIGID" IsAttributeChanged="false">
  <foundation:Name>Rigid Board Area</foundation:Name>
  <foundation:Description>Rigid area of flex-rigid board</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>SHAPE_RIGID_AREA</pdm:Shape>
  
  <!-- 组装到层堆叠：此区域使用刚性堆叠 -->
  <pdm:AssembleToName>RIGID_STACKUP</pdm:AssembleToName>
</foundation:Item>

<foundation:Item id="ITEM_BOARD_AREA_FLEX" geometryType="BOARD_AREA_FLEXIBLE" IsAttributeChanged="false">
  <foundation:Name>Flexible Board Area</foundation:Name>
  <foundation>Description>Flexible area of flex-rigid board</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>SHAPE_FLEX_AREA</pdm:Shape>
  
  <!-- 组装到层堆叠：此区域使用柔性堆叠 -->
  <pdm:AssembleToName>FLEX_STACKUP</pdm:AssembleToName>
</foundation:Item>
```

**注意事项**：

1. **Z轴坐标系**：
   - 使用绝对Z坐标，Z=0通常为板底面
   - 层堆叠中的层按Z值从小到大排列（从下到上）
   - 负Z值可用于板底面以下的层（如底面阻焊、丝印）

2. **层类型选择**：
   - `LAYER_OTHERSIGNAL`: 普通信号层
   - `LAYER_POWERGROUND`: 电源/地层
   - `LAYER_SOLDERMASK`: 阻焊层
   - `LAYER_SILKSCREEN`: 丝印层
   - `LAYER_DIELECTRIC`: 介质层
   - `LAYER_SOLDERPASTE`: 锡膏层

3. **层堆叠装配**：
   - 使用`geometryType="LAYER_STACKUP"`的Assembly Item
   - 按从下到上的顺序添加层实例
   - 每个层实例定义其在该堆叠中的Z轴范围

4. **刚柔结合板**：
   - 需要多个不同的层堆叠
   - 板区域通过`AssembleToName`引用相应的堆叠
   - 柔性区域通常层数较少，厚度较薄

5. **传统方式差异**：
   - 使用`EDMDStratum`和`EDMDStratumTechnology`对象
   - 结构较深，但提供更详细的层技术属性

6. **Z范围定义位置**：
   - 可以在层定义时指定（推荐）
   - 也可以在层堆叠实例中指定
   - 确保所有层都有明确的Z范围

**建模差异**：

| 对比维度       | 传统建模                                    | 优化建模（IDXv4.0+）        |
| -------------- | ------------------------------------------- | --------------------------- |
| **层定义**     | 使用`EDMDStratum` + `EDMDStratumTechnology` | 使用`Item` + `geometryType` |
| **层属性**     | 通过`StratumTechnology`的`LayerPurpose`定义 | 通过`geometryType`直接定义  |
| **结构复杂度** | 较深，多层级                                | 扁平，直接使用Item          |
| **灵活性**     | 支持复杂的层技术属性                        | 简化，但足够大多数应用      |
| **推荐场景**   | 需要详细层技术信息                          | 大多数PCB设计               |

**类型定义**：

```typescript
// ============= 物理层和层堆叠类型 =============

/**
 * 层技术类型枚举
 */
export enum LayerTechnologyType {
  /** 信号层 */
  SIGNAL = 'LAYER_OTHERSIGNAL',
  /** 电源/地层 */
  POWER_GROUND = 'LAYER_POWERGROUND',
  /** 阻焊层 */
  SOLDERMASK = 'LAYER_SOLDERMASK',
  /** 丝印层 */
  SILKSCREEN = 'LAYER_SILKSCREEN',
  /** 介质层 */
  DIELECTRIC = 'LAYER_DIELECTRIC',
  /** 锡膏层 */
  SOLDERPASTE = 'LAYER_SOLDERPASTE',
  /** 胶层 */
  GLUE = 'LAYER_GLUE',
  /** 仅焊盘层 */
  LANDS_ONLY = 'LAYER_LANDSONLY',
}

/**
 * 层定义接口（简化方式）
 */
export interface LayerDefinition {
  /** 层ID */
  id: string;
  /** 层类型 */
  layerType: LayerTechnologyType;
  /** 层名称 */
  name: string;
  /** 层描述 */
  description?: string;
  /** 参考名称（被堆叠引用） */
  referenceName: string;
  /** Z轴下边界 */
  lowerBound: number;
  /** Z轴上边界 */
  upperBound: number;
  /** 材料属性 */
  material?: string;
  /** 厚度 */
  thickness?: number;
  /** 介电常数（介质层） */
  dielectricConstant?: number;
}

/**
 * 层堆叠定义接口
 */
export interface LayerStackupDefinition {
  /** 堆叠ID */
  id: string;
  /** 堆叠名称 */
  name: string;
  /** 堆叠描述 */
  description?: string;
  /** 参考名称（被板区域引用） */
  referenceName: string;
  /** 层列表（按从下到上的顺序） */
  layers: LayerStackupLayer[];
  /** 总厚度 */
  totalThickness: number;
}

/**
 * 层堆叠中的层定义
 */
export interface LayerStackupLayer {
  /** 层引用名称 */
  layerReferenceName: string;
  /** 在此堆叠中的下边界 */
  lowerBound: number;
  /** 在此堆叠中的上边界 */
  upperBound: number;
  /** 材料（可覆盖层定义） */
  material?: string;
  /** 层用途（可覆盖层定义） */
  layerPurpose?: string;
}
```

**总结**：
物理层和层堆叠是描述PCB层压结构的关键。简化建模使用`geometryType`属性直接标识层类型，并通过层堆叠装配组织层顺序。传统建模则使用更详细的技术对象。对于复杂设计（如刚柔结合板），需要多个层堆叠和相应的板区域定义。正确设置Z轴范围对于3D可视化至关重要。

#### **第7层：3D模型(Model3D)**

**完整示例**：

```xml
<!-- TEST_CASE: 3D模型定义 -->
<foundation:Model3D id="MODEL_3D_001" xsi:type="pdm:EDMDModel3D">
  <!-- 必选：3D模型标识符（文件名、URL或PDM系统ID） -->
  <pdm:ModelIdentifier>capacitor_0402.step</pdm:ModelIdentifier>
  <!-- 必选：MCAD格式类型 -->
  <pdm:MCADFormat>STEP</pdm:MCADFormat>
    
  <!-- 可选：模型版本/配置（用于多配置模型文件） -->
  <pdm:ModelVersion>REV_B</pdm:ModelVersion>
  <!-- 可选：模型存储位置（相对路径或URL） -->
  <pdm:ModelLocation>/library/components/</pdm:ModelLocation>
  <!-- 可选：MCAD格式版本 -->
  <pdm:MCADFormatVersion>AP214</pdm:MCADFormatVersion>
  <!-- 可选：对齐变换矩阵（用于调整3D模型与ECAD封装的相对位置） -->
  <pdm:Transformation xsi:type="pdm:EDMDTransformation">
    <pdm:TransformationType>d3</pdm:TransformationType>
    <pdm:xx>1.000000</pdm:xx>
    <pdm:xy>0.000000</pdm:xy>
    <pdm:xz>0.000000</pdm:xz>
    <pdm:yx>0.000000</pdm:yx>
    <pdm:yy>1.000000</pdm:yy>
    <pdm:yz>0.000000</pdm:yz>
    <pdm:zx>0.000000</pdm:zx>
    <pdm:zy>0.000000</pdm:zy>
    <pdm:zz>1.000000</pdm:zz>
    <pdm:tx xsi:type="property:EDMDLengthProperty">
      <property:Value>0.000000</property:Value>
    </pdm:tx>
    <pdm:ty xsi:type="property:EDMDLengthProperty">
      <property:Value>0.000000</property:Value>
    </pdm:ty>
    <pdm:tz xsi:type="property:EDMDLengthProperty">
      <property:Value>0.000000</property:Value>
    </pdm:tz>
  </pdm:Transformation>
  <!-- 可选：变换参考（替代Transformation，使用MCAD坐标系对齐） -->
  <pdm:TransformationReference>CSYS_TOP</pdm:TransformationReference>
</foundation:Model3D>

<!-- 在组件Item中引用3D模型 -->
<foundation:Item id="CMP_0402_CAP_001">
  <pdm:ItemType>single</pdm:ItemType>
  <!-- 标准引用方式（IDXv4.0+） -->
  <pdm:EDMD3DModel>MODEL_3D_001</pdm:EDMD3DModel>
  <!-- 其他组件属性 -->
  <pdm:Shape>SHAPE_0402</pdm:Shape>
</foundation:Item>
```

**注意事项**

1. **模型标识**：`ModelIdentifier`可以是文件名、URL或PDM系统ID，接收系统需要知道如何访问该模型
2. **格式兼容性**：建议使用STEP格式确保跨平台兼容性，也可以使用原生格式（如SolidWorks、NX等）
3. **坐标系对齐**：
   - 使用`Transformation`矩阵进行精确的平移/旋转对齐
   - 或使用`TransformationReference`引用MCAD模型中的坐标系
   - 如果两者都提供，建议优先使用`TransformationReference`
4. **模型位置**：`ModelLocation`是相对路径，需要与ECAD/MCAD系统约定的根目录配合使用

**传统建模与优化建模差异**

- **传统建模（IDXv3.0及以前）**：通过自定义`UserProperty`间接引用3D模型，缺乏标准属性命名和结构化数据
- **优化建模（IDXv4.0+）**：使用标准`Model3D`对象，结构化数据易于解析，支持复杂变换关系和版本控制

**类型定义**

```ts
/**
 * 3D模型对象 (IDXv4.0+)
 *
 * @remarks
 * 用于关联外部3D CAD模型到IDX组件
 * 一个Model3D可以被多个组件引用
 * REF: Section 6.2.1.3, Page 78-79
 */
export interface EDMDModel3D extends EDMDObject {
  /** 3D模型标识符（必选） - 文件名、URL或PDM系统ID */
  ModelIdentifier: string;
  
  /** MCAD格式类型（必选） */
  MCADFormat: string;
  
  /** 模型版本/配置ID（可选） */
  ModelVersion?: string;
  
  /** 模型存储位置（可选） - 相对路径或URL */
  ModelLocation?: string;
  
  /** MCAD格式版本（可选） */
  MCADFormatVersion?: string;
  
  /** 对齐变换矩阵（可选） */
  Transformation?: EDMDTransformation;
  
  /** 变换参考（可选） - 替代Transformation，使用MCAD坐标系对齐 */
  TransformationReference?: string;
}

/**
 * 组件Item扩展：支持3D模型引用
 */
export interface EDMDItemWith3D extends EDMDItem {
  /** 引用的3D模型（可选） - IDXv4.0+特性 */
  EDMD3DModel?: string; // 引用Model3D对象的id
}
```

#### **第8层：封装(Package)**

**完整示例**：

```xml
<!-- TEST_CASE: 封装定义（组件级PackageName） -->
<foundation:Item id="CMP_0402_CAP" xsi:type="pdm:EDMDItem">
  <!-- 必选：Item类型 -->
  <pdm:ItemType>single</pdm:ItemType>
  
  <!-- 必选：封装名称（PackageName） -->
  <pdm:PackageName xsi:type="foundation:EDMDName">
    <foundation:SystemScope>LIBRARY_SYSTEM</foundation:SystemScope>
    <foundation:ObjectName>CAP_0402_100NF_10V</foundation:ObjectName>
  </pdm:PackageName>
  
  <!-- 可选：封装引脚定义（IDXv4.0+） -->
  <pdm:PackagePin pinNumber="1" primary="true">
    <!-- 引脚位置 -->
    <d2:Point xsi:type="d2:EDMDCartesianPoint">
      <d2:X xsi:type="property:EDMDLengthProperty">
        <property:Value>-0.500000</property:Value>
      </d2:X>
      <d2:Y xsi:type="property:EDMDLengthProperty">
        <property:Value>0.000000</property:Value>
      </d2:Y>
    </d2:Point>
    <!-- 引脚形状（可选） -->
    <pdm:Shape>PIN_SHAPE_RECT_1</pdm:Shape>
  </pdm:PackagePin>
  
  <pdm:PackagePin pinNumber="2" primary="false">
    <d2:Point xsi:type="d2:EDMDCartesianPoint">
      <d2:X xsi:type="property:EDMDLengthProperty">
        <property:Value>0.500000</property:Value>
      </d2:X>
      <d2:Y xsi:type="property:EDMDLengthProperty">
        <property:Value>0.000000</property:Value>
      </d2:Y>
    </d2:Point>
    <pdm:Shape>PIN_SHAPE_RECT_2</pdm:Shape>
  </pdm:PackagePin>
  
  <!-- 可选：封装级别的用户属性 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key xsi:type="foundation:EDMDName">
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>PACKAGE_TYPE</foundation:ObjectName>
    </property:Key>
    <property:Value>SMD</property:Value>
  </foundation:UserProperty>
  
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key xsi:type="foundation:EDMDName">
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>PACKAGE_HEIGHT</foundation.ObjectName>
    </property:Key>
    <property:Value>0.600000</property:Value>
  </foundation:UserProperty>
  
  <!-- 组件形状引用 -->
  <pdm:Shape>COMP_SHAPE_0402</pdm:Shape>
</foundation:Item>

<!-- 实例中引用封装（通过Item引用） -->
<foundation:Item id="INST_C1" xsi:type="pdm:EDMDItem">
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance>
    <pdm:Item>CMP_0402_CAP</pdm:Item>  <!-- 引用上面的封装定义 -->
    <pdm:InstanceName xsi:type="foundation:EDMDName">
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>C1</foundation:ObjectName>
    </pdm:InstanceName>
    <!-- 实例变换 -->
    <pdm:Transformation xsi:type="pdm:EDMDTransformation">
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <pdm:tx>10.000000</pdm:tx>
      <pdm:ty>20.000000</pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
</foundation:Item>
```

**注意事项**

1. **封装名称唯一性**：`PackageName`在上下文中应该唯一，用于标识特定封装类型
2. **引脚定义**：
   - `pinNumber`：引脚编号，字符串类型，支持字母数字组合（如"A1"、"1"、"PAD1"）
   - `primary`：标识主引脚（通常是Pin 1），用于3D模型对齐
   - 引脚位置是相对于封装原点的局部坐标
3. **封装复用**：同一个封装定义（Item of type single）可以被多个实例引用
4. **封装与实例分离**：封装定义描述几何和电气特性，实例描述位置和方向

**传统建模与优化建模差异**

- **传统建模**：封装信息主要通过自定义`UserProperty`描述，缺乏标准化的引脚定义
- **优化建模（IDXv4.0+）**：
  - 使用标准`PackageName`属性标识封装
  - 支持结构化`PackagePin`元素定义引脚位置和形状
  - 支持`primary`属性标识主引脚，便于3D模型对齐

**类型定义**

参考后文“第10层：项目实例和项目装配 (Item Assembly)”章节。

#### **第9层：项目定义 (Item Single)**

**完整示例**：

```xml
<!-- =========== 1. 板框 (BOARD_OUTLINE) =========== -->
<!-- TEST_CASE: 简化方式 - 板框定义 -->
<foundation:Item id="ITEM_BOARD_SINGLE" geometryType="BOARD_OUTLINE" IsAttributeChanged="false">
  <foundation:Name>PCB Board</foundation:Name>
  <foundation:Description>Main board outline with cutouts</foundation:Description>
  <!-- 项目类型：single 表示定义，assembly 表示实例 -->
  <pdm:ItemType>single</pdm:ItemType>
  
  <!-- 项目标识符（可选但推荐）：用于变更追踪 -->
  <pdm:Identifier xsi:type="foundation:EDMDIdentifier">
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:Number>BOARD001</foundation:Number>
    <foundation:Version>1</foundation:Version>
    <foundation:Revision>0</foundation:Revision>
    <foundation:Sequence>0</foundation:Sequence>
  </pdm:Identifier>
  
  <!-- 包名称（可选）：用于可重用封装 -->
  <pdm:PackageName xsi:type="foundation:EDMDName">
    <foundation:SystemScope>MCADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>BOARD_100x100</foundation:ObjectName>
  </pdm:PackageName>
  
  <!-- 形状引用：简化方式直接引用ShapeElement -->
  <pdm:Shape>SHAPE_BOARD_OUTLINE</pdm:Shape>
  
  <!-- 基线标记（可选）：表示是否为基线项目 -->
  <pdm:BaseLine>
    <property:Value>true</property:Value>
  </pdm:BaseLine>
</foundation:Item>

<!-- =========== 2. 组件 (COMPONENT) =========== -->
<!-- TEST_CASE: 简化方式 - 电气组件定义 -->
<foundation:Item id="ITEM_COMPONENT_SINGLE" geometryType="COMPONENT" IsAttributeChanged="false">
  <foundation:Name>Resistor 0805</foundation:Name>
  <foundation:Description>0805 package resistor</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  
  <!-- 标识符 -->
  <pdm:Identifier>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:Number>R0805</foundation:Number>
    <foundation:Version>1</foundation:Version>
    <foundation:Revision>0</foundation:Revision>
    <foundation:Sequence>0</foundation:Sequence>
  </pdm:Identifier>
  
  <!-- 包名称：封装名称 -->
  <pdm:PackageName>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>0805</foundation:ObjectName>
  </pdm:PackageName>
  
  <!-- 引脚定义（可选）：用于3D模型对齐 -->
  <pdm:PackagePin pinNumber="1" primary="true">
    <d2:Point>PT_PIN1</d2:Point>
    <pdm:Shape>SHAPE_PIN1</pdm:Shape>
  </pdm:PackagePin>
  <pdm:PackagePin pinNumber="2" primary="false">
    <d2:Point>PT_PIN2</d2:Point>
    <pdm:Shape>SHAPE_PIN2</pdm:Shape>
  </pdm:PackagePin>
  
  <!-- 用户属性：元件参数 -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>RESISTANCE</foundation:ObjectName>
    </property:Key>
    <property:Value>1000</property:Value>
  </foundation:UserProperty>
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>TOLERANCE</foundation:ObjectName>
    </property:Key>
    <property:Value>5</property:Value>
  </foundation:UserProperty>
  
  <!-- 热属性（可选） -->
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>POWER_MAX</foundation:ObjectName>
    </property:Key>
    <property:Value>0.125</property:Value>
  </foundation:UserProperty>
  
  <!-- 形状引用 -->
  <pdm:Shape>SHAPE_RESISTOR_0805</pdm:Shape>
  
  <!-- 3D模型引用（可选） -->
  <pdm:EDMD3DModel>MODEL_RESISTOR_0805</pdm:EDMD3DModel>
</foundation:Item>

<!-- =========== 3. 孔 (HOLE_PLATED) =========== -->
<!-- TEST_CASE: 简化方式 - 电镀孔定义 -->
<foundation:Item id="ITEM_HOLE_PLATED_SINGLE" geometryType="HOLE_PLATED" IsAttributeChanged="false">
  <foundation:Name>Plated Hole 3mm</foundation:Name>
  <foundation:Description>Plated through hole with 3mm diameter</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  
  <!-- 标识符 -->
  <pdm:Identifier>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:Number>PTH_3mm</foundation:Number>
    <foundation:Version>1</foundation:Version>
    <foundation:Revision>0</foundation:Revision>
    <foundation:Sequence>0</foundation:Sequence>
  </pdm:Identifier>
  
  <!-- 包名称：孔焊盘名称 -->
  <pdm:PackageName>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>PAD_3mm</foundation:ObjectName>
  </pdm:PackageName>
  
  <!-- 形状引用 -->
  <pdm:Shape>SHAPE_PLATED_HOLE_3MM</pdm:Shape>
</foundation:Item>

<!-- =========== 4. 传统方式 - 板框定义 =========== -->
<!-- TEST_CASE: 传统方式 - 使用Stratum作为Third Item -->
<foundation:Item id="ITEM_BOARD_TRADITIONAL" IsAttributeChanged="false">
  <foundation:Name>PCB Board Traditional</foundation:Name>
  <foundation:Description>Board defined using traditional method</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  
  <!-- 传统方式：没有geometryType属性 -->
  
  <!-- 形状引用：引用Stratum对象 -->
  <pdm:Shape>STRATUM_BOARD</pdm:Shape>
</foundation:Item>

<!-- =========== 5. 传统方式 - 组件定义 =========== -->
<!-- TEST_CASE: 传统方式 - 使用AssemblyComponent作为Third Item -->
<foundation:Item id="ITEM_COMPONENT_TRADITIONAL" IsAttributeChanged="false">
  <foundation:Name>Capacitor 0603</foundation:Name>
  <foundation:Description>0603 capacitor using traditional method</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  
  <pdm:PackageName>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>0603</foundation:ObjectName>
  </pdm:PackageName>
  
  <!-- 传统方式：引用AssemblyComponent -->
  <pdm:Shape>ASSEMBLY_COMP_CAPACITOR</pdm:Shape>
</foundation:Item>

<!-- =========== 6. 禁布区定义 =========== -->
<!-- TEST_CASE: 简化方式 - 禁布区定义 -->
<foundation:Item id="ITEM_KEEPOUT_SINGLE" geometryType="KEEPOUT_AREA_ROUTE" IsAttributeChanged="false">
  <foundation:Name>Route Keepout Area</foundation:Name>
  <foundation:Description>No routing allowed in this area</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>SHAPE_ROUTE_KEEPOUT</pdm:Shape>
</foundation:Item>

<!-- =========== 7. 弯曲区域定义 =========== -->
<!-- TEST_CASE: 简化方式 - 弯曲区域定义 -->
<foundation:Item id="ITEM_BEND_SINGLE" geometryType="BEND" IsAttributeChanged="false">
  <foundation:Name>Bend Area</foundation:Name>
  <foundation:Description>Flexible bend area</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>BEND_FLEX_AREA</pdm:Shape>
</foundation:Item>

<!-- =========== 8. 物理层定义 =========== -->
<!-- TEST_CASE: 简化方式 - 阻焊层定义 -->
<foundation:Item id="ITEM_LAYER_SOLDERMASK" geometryType="LAYER_SOLDERMASK" IsAttributeChanged="false">
  <foundation:Name>Solder Mask Top</foundation:Name>
  <foundation:Description>Top layer solder mask</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>SHAPE_SOLDERMASK_TOP</pdm:Shape>
  <!-- 参考名称：被Stackup引用 -->
  <pdm:ReferenceName>TOP_SOLDERMASK</pdm:ReferenceName>
</foundation:Item>
```

**注意事项**：

1. **geometryType使用**：
   - 简化方式：必须使用`geometryType`属性
   - 传统方式：不使用`geometryType`属性

2. **形状引用差异**：
   - 简化方式：直接引用`ShapeElement`
   - 传统方式：引用Third Item（Stratum、AssemblyComponent等）

3. **标识符重要性**：
   - 不是必需的，但强烈推荐
   - 用于变更跟踪（SendChanges消息）
   - 确保`SystemScope`在协作中保持稳定

4. **包名称（PackageName）**：
   - 用于可重用封装（元件封装、孔类型）
   - 相同包名称的项目可被多个实例引用

5. **引脚定义（PackagePin）**：
   - 用于精确的3D模型对齐
   - primary=true标识主引脚（引脚1）

6. **用户属性**：
   - 用于存储元件参数（电阻值、容差等）
   - 注意单位：只存储数值，不包含单位字符串

7. **3D模型引用**：
   - 提供更详细的几何信息
   - 引用外部的3D模型文件

**建模差异**：

| 对比维度         | 传统建模                       | 优化建模（IDXv4.0+）     |
| ---------------- | ------------------------------ | ------------------------ |
| **geometryType** | 不使用                         | 必须使用                 |
| **Shape引用**    | 引用Third Item对象             | 直接引用ShapeElement     |
| **结构深度**     | Item→Third Item→ShapeElement   | Item→ShapeElement        |
| **文件大小**     | 较大                           | 较小                     |
| **可读性**       | 需要查看Third Item才能知道类型 | geometryType直接说明类型 |

**类型定义**：

```typescript
// ============= 项目定义 (Item single) =============

/**
 * 项目类型枚举
 *
 * @remarks
 * 定义EDMDItem的ItemType属性，标识项目是单个还是装配体
 * REF: Section 4.1
 */
export enum ItemType {
	/** 简单类型-项目定义 */
	SINGLE = 'single',
	/** 复杂类型-项目实例 */
	ASSEMBLY = 'assembly',
}

/**
 * 标识符定义
 *
 * @remarks
 * 用于唯一标识一个项目，包含系统范围、编号、版本、修订和序列号
 * REF: Section 5.2.1
 */
export interface EDMDIdentifier {
	/** 系统范围，定义命名空间 */
	SystemScope: string;
	/** 项目编号，在系统范围内唯一 */
	Number: string;
	/** 版本号 */
	Version: string;
	/** 修订号 */
	Revision: string;
	/** 序列号，用于变更跟踪 */
	Sequence: string;
	/** 是否属性已变更 */
	IsAttributeChanged?: boolean;
	/** 是否持久化 */
	Persistent?: boolean;
	/** 是否创建者 */
	IsOriginator?: boolean;
}

/**
 * 项目定义（ItemType="single"）
 *
 * @remarks
 * 表示项目的几何定义，可被多个实例引用
 * REF: Section 4.1
 * XML: <foundation:Item>
 */
export interface EDMDItemSingle extends EDMDObject {
	/** 项目类型，必须为 "single" */
	ItemType: ItemType.SINGLE;
	/** 几何类型（简化方式使用，传统方式不使用） */
	geometryType?: GeometryType;
	/** 项目唯一标识符 */
	Identifier?: EDMDIdentifier;
	/** 包名称（用于可重用封装，如元件封装） */
	PackageName?: EDMDName;
	/** 参考名称（用于被其他项目引用，如层被Stackup引用） */
	ReferenceName?: string;
	/** 形状引用：简化方式引用ShapeElement，传统方式引用Third Item */
	Shape: string;
	/** 包引脚定义（用于封装引脚位置） */
	PackagePins?: EDMPackagePin[];
	/** 3D模型引用（可选） */
	EDMD3DModel?: string;
	/** 基线标记 */
	BaseLine?: boolean;
	/** 组装到名称（用于相对定位） */
	AssembleToName?: string;
}

/**
 * 包引脚定义
 *
 * @remarks
 * 用于定义元件引脚的位置和形状
 * REF: Section 6.2.1.5
 */
export interface EDMPackagePin {
	/** 引脚编号 */
	pinNumber: string;
	/** 是否为主引脚 */
	primary: boolean;
	/** 引脚位置点引用 */
	Point: string;
	/** 引脚形状引用 */
	Shape?: string;
}

/**
 * 3D模型定义
 *
 * @remarks
 * 用于引用外部3D模型文件
 * REF: Section 6.2.1.3
 */
export interface EDMD3DModel extends EDMDObject {
	/** 模型标识符（文件名或ID） */
	ModelIdentifier: string;
	/** 模型版本/配置 */
	ModelVersion?: string;
	/** 模型位置（相对路径） */
	ModelLocation?: string;
	/** MCAD格式 */
	MCADFormat: string;
	/** MCAD格式版本 */
	MCADFormatVersion?: string;
	/** 变换矩阵（用于对齐） */
	Transformation?: string;
	/** 变换参考（坐标系参考） */
	TransformationReference?: string;
}
```

#### **第10层：项目实例和项目装配 (Item Assembly)**

**完整示例**：

```xml
<!-- =========== 1. 板装配 (BOARD_OUTLINE) =========== -->
<!-- TEST_CASE: 简化方式 - 板装配，包含主板和多个孔 -->
<foundation:Item id="ITEM_BOARD_ASSEMBLY" geometryType="BOARD_OUTLINE" IsAttributeChanged="false">
  <foundation:Name>PCB Board Assembly</foundation:Name>
  <foundation:Description>Complete board assembly with holes and cutouts</foundation:Description>
  <!-- 项目类型：assembly 表示装配体 -->
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 标识符 -->
  <pdm:Identifier>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:Number>BOARD_ASSEMBLY_001</foundation:Number>
    <foundation:Version>1</foundation:Version>
    <foundation:Revision>0</foundation:Revision>
    <foundation:Sequence>0</foundation:Sequence>
  </pdm:Identifier>
  
  <!-- 项目实例列表 -->
  <pdm:ItemInstance id="ITEMINST_BOARD" IsAttributeChanged="false">
    <!-- 引用的项目ID（ITEM_BOARD_SINGLE） -->
    <pdm:Item>ITEM_BOARD_SINGLE</pdm:Item>
    
    <!-- 实例名称 -->
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>Board_Instance_1</foundation:ObjectName>
    </pdm:InstanceName>
    
    <!-- 变换矩阵：2D变换，定义位置和旋转 -->
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <!-- 旋转矩阵元素 -->
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <!-- 平移 -->
      <pdm:tx>
        <property:Value>0.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>0.000000</property:Value>
      </pdm:ty>
    </pdm:Transformation>
    
    <!-- Z轴偏移（可选，IDXv4.0+）：相对板表面的偏移 -->
    <pdm:zOffset>
      <property:Value>0.000000</property:Value>
    </pdm:zOffset>
    
    <!-- 用户属性：实例特定信息 -->
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>LAYER</foundation:ObjectName>
      </property:Key>
      <property:Value>TOP</property:Value>
    </foundation:UserProperty>
  </pdm:ItemInstance>
  
  <!-- 孔实例1 -->
  <pdm:ItemInstance id="ITEMINST_HOLE1" IsAttributeChanged="false">
    <pdm:Item>ITEM_HOLE_PLATED_SINGLE</pdm:Item>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>Hole_Instance_1</foundation:ObjectName>
    </pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <!-- 孔在板上的位置 -->
      <pdm:tx>
        <property:Value>20.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>30.000000</property:Value>
      </pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
  
  <!-- 孔实例2 -->
  <pdm:ItemInstance id="ITEMINST_HOLE2" IsAttributeChanged="false">
    <pdm:Item>ITEM_HOLE_PLATED_SINGLE</pdm:Item>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>Hole_Instance_2</foundation:ObjectName>
    </pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <pdm:tx>
        <property:Value>80.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>30.000000</property:Value>
      </pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
  
  <!-- 元件实例1 -->
  <pdm:ItemInstance id="ITEMINST_COMP1" IsAttributeChanged="false">
    <pdm:Item>ITEM_COMPONENT_SINGLE</pdm:Item>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>R1</foundation:ObjectName>
    </pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <!-- 45度旋转 -->
      <pdm:xx>0.707107</pdm:xx>
      <pdm:xy>0.707107</pdm:xy>
      <pdm:yx>-0.707107</pdm:yx>
      <pdm:yy>0.707107</pdm:yy>
      <pdm:tx>
        <property:Value>50.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>50.000000</property:Value>
      </pdm:ty>
    </pdm:Transformation>
    
    <!-- 角色和权限（可选）：标记实例的所有权 -->
    <foundation:RoleOnItemInstance>
      <administration:RoleName>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>Owner</foundation:ObjectName>
      </administration:RoleName>
      <administration:RoleType>owner</administration:RoleType>
      <administration:Category>Electrical</administration:Category>
    </foundation:RoleOnItemInstance>
  </pdm:ItemInstance>
  
  <!-- 组装到名称（可选）：相对定位参考 -->
  <pdm:AssembleToName>TOP</pdm:AssembleToName>
  
  <!-- 基线标记 -->
  <pdm:BaseLine>
    <property:Value>true</property:Value>
  </pdm:BaseLine>
</foundation:Item>

<!-- =========== 2. 元件装配 (COMPONENT) =========== -->
<!-- TEST_CASE: 简化方式 - 元件装配，通常用于复杂元件 -->
<foundation:Item id="ITEM_COMP_ASSEMBLY" geometryType="COMPONENT" IsAttributeChanged="false">
  <foundation:Name>IC Assembly</foundation:Name>
  <foundation:Description>IC with multiple sub-components</foundation:Description>
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 子元件实例（如IC本体和散热器） -->
  <pdm:ItemInstance id="ITEMINST_IC_BODY">
    <pdm:Item>ITEM_IC_BODY_SINGLE</pdm:Item>
    <pdm:InstanceName>IC_Body</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <pdm:tx>
        <property:Value>0.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>0.000000</property:Value>
      </pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
  
  <pdm:ItemInstance id="ITEMINST_HEATSINK">
    <pdm:Item>ITEM_HEATSINK_SINGLE</pdm:Item>
    <pdm:InstanceName>Heatsink</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <pdm:tx>
        <property:Value>0.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>5.000000</property:Value>
      </pdm:ty>
      <!-- Z轴偏移：散热器在IC上方5mm -->
      <pdm:zOffset>
        <property:Value>5.000000</property:Value>
      </pdm:zOffset>
    </pdm:Transformation>
  </pdm:ItemInstance>
</foundation:Item>

<!-- =========== 3. 柔性板弯曲装配 (BEND) =========== -->
<!-- TEST_CASE: 简化方式 - 弯曲装配，用于柔性板 -->
<foundation:Item id="ITEM_BEND_ASSEMBLY" geometryType="BEND" IsAttributeChanged="false">
  <foundation:Name>Flex Bend Assembly</foundation:Name>
  <foundation:Description>Flexible board bend area</foundation:Description>
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 弯曲区域实例 -->
  <pdm:ItemInstance id="ITEMINST_BEND_AREA" bendSequenceNumber="1">
    <!-- bendSequenceNumber: 弯曲顺序（1表示第一个弯曲） -->
    <pdm:Item>ITEM_BEND_SINGLE</pdm:Item>
    <pdm:InstanceName>Bend_Area_1</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <pdm:tx>
        <property:Value>30.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>20.000000</property:Value>
      </pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
</foundation:Item>

<!-- =========== 4. 层堆叠装配 (LAYER_STACKUP) =========== -->
<!-- TEST_CASE: 简化方式 - 层堆叠装配 -->
<foundation:Item id="ITEM_STACKUP_ASSEMBLY" geometryType="LAYER_STACKUP" IsAttributeChanged="false">
  <foundation:Name>Layer Stackup</foundation:Name>
  <foundation:Description>PCB layer stackup definition</foundation:Description>
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 参考名称：被板区域引用 -->
  <pdm:ReferenceName>PCB_Stackup</pdm:ReferenceName>
  
  <!-- 层实例（按堆叠顺序） -->
  <pdm:ItemInstance id="ITEMINST_TOP_SOLDERMASK">
    <pdm:Item>ITEM_LAYER_SOLDERMASK</pdm:Item>
    <pdm:InstanceName>Top_SolderMask</pdm:InstanceName>
    <!-- 用户属性定义层类型和Z范围 -->
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>LayerType</foundation:ObjectName>
      </property:Key>
      <property:Value>SolderMask</property:Value>
    </foundation:UserProperty>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>UpperBound</foundation:ObjectName>
      </property:Key>
      <property:Value>1.610000</property:Value>
    </foundation:UserProperty>
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>LowerBound</foundation:ObjectName>
      </property:Key>
      <property:Value>1.600000</property:Value>
    </foundation:UserProperty>
  </pdm:ItemInstance>
  
  <!-- 更多层实例... -->
</foundation:Item>

<!-- =========== 5. 传统方式 - 板装配 =========== -->
<!-- TEST_CASE: 传统方式 - 没有geometryType -->
<foundation:Item id="ITEM_BOARD_ASSEMBLY_TRADITIONAL" IsAttributeChanged="false">
  <foundation:Name>Board Assembly Traditional</foundation:Name>
  <foundation:Description>Traditional board assembly</foundation:Description>
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 传统方式没有geometryType -->
  
  <!-- 实例引用传统方式定义的项目 -->
  <pdm:ItemInstance id="ITEMINST_BOARD_TRAD">
    <pdm:Item>ITEM_BOARD_TRADITIONAL</pdm:Item>
    <pdm:InstanceName>Board_Instance_Trad</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.000000</pdm:xx>
      <pdm:xy>0.000000</pdm:xy>
      <pdm:yx>0.000000</pdm:yx>
      <pdm:yy>1.000000</pdm:yy>
      <pdm:tx>
        <property:Value>0.000000</property:Value>
      </pdm:tx>
      <pdm:ty>
        <property:Value>0.000000</property:Value>
      </pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
</foundation:Item>
```

**注意事项**：

1. **几何类型继承**：
   - 简化方式：Assembly通常继承其包含的Item的geometryType
   - 对于板装配，geometryType通常为`BOARD_OUTLINE`
   - 对于元件装配，geometryType通常为`COMPONENT`

2. **变换矩阵**：
   - `TransformationType`: `d2`表示2D变换，`d3`表示3D变换
   - 2D变换用于大多数PCB元件定位
   - 3D变换用于特殊3D定位需求

3. **Z轴偏移**：
   - IDXv4.0+引入，用于相对定位
   - 正值表示远离参考表面，负值表示朝向参考表面
   - 与`AssembleToName`配合使用

4. **弯曲顺序**：
   - `bendSequenceNumber`定义柔性板弯曲顺序
   - 数字越小，弯曲越早执行

5. **角色和权限**：
   - 用于协作权限控制
   - 可以标记实例为只读或特定系统的专有

6. **实例引用完整性**：
   - `Item`属性必须引用已定义的Item Single的ID
   - 所有引用的Item必须已正确定义

7. **装配层次**：
   - Assembly可以包含其他Assembly的实例
   - 支持多层次嵌套结构

**建模差异**：

| 对比维度         | 传统建模                     | 优化建模（IDXv4.0+）            |
| ---------------- | ---------------------------- | ------------------------------- |
| **geometryType** | 通常不使用                   | 推荐使用，提高可读性            |
| **结构深度**     | 较深，包含Third Item层       | 较浅，直接引用ShapeElement      |
| **权限控制**     | 可能缺少角色定义             | 支持精细的角色权限              |
| **相对定位**     | 较少使用AssembleToName       | 充分利用AssembleToName和zOffset |
| **弯曲支持**     | 可能不支持bendSequenceNumber | 完整支持柔性板特性              |

**类型定义**：

```typescript
// ============= 项目实例和项目装配 (Item assembly) =============

/**
 * 变换类型枚举
 *
 * @remarks
 * 定义变换矩阵的类型
 */
export enum TransformationType {
  /** 2D变换 */
  D2 = 'd2',
  /** 3D变换 */
  D3 = 'd3',
}

/**
 * 变换矩阵定义
 *
 * @remarks
 * 用于定义项目的平移、旋转和缩放
 * REF: Section 4.1.1.1
 */
export interface EDMDTransformation {
  /** 变换类型 */
  TransformationType: TransformationType;
  /** 2D/3D变换矩阵元素 */
  xx: number;
  xy: number;
  yx?: number;
  yy?: number;
  zx?: number;
  zy?: number;
  zz?: number;
  /** 平移向量 */
  tx: EDMDLengthProperty;
  ty: EDMDLengthProperty;
  tz?: EDMDLengthProperty;
}

/**
 * 角色定义
 *
 * @remarks
 * 用于定义实例的协作权限
 * REF: Section 4.1.3
 */
export interface RoleOnItemInstance {
  /** 角色名称 */
  RoleName: EDMDName;
  /** 角色类型 */
  RoleType: 'owner' | 'designer' | 'reviewer';
  /** 类别（电气/机械） */
  Category: 'Electrical' | 'Mechanical' | string;
  /** 上下文（实例ID） */
  Context?: string;
}

/**
 * 项目实例定义
 *
 * @remarks
 * 表示项目定义的一个具体实例，包含位置和变换信息
 * REF: Section 4.1.1.1
 */
export interface EDMDItemInstance extends EDMDObject {
  /** 引用的项目ID */
  Item: string;
  /** 实例名称 */
  InstanceName?: EDMDName;
  /** 变换矩阵 */
  Transformation?: EDMDTransformation;
  /** Z轴偏移（相对定位，IDXv4.0+） */
  zOffset?: EDMDLengthProperty;
  /** 弯曲序列号（用于柔性板弯曲顺序） */
  bendSequenceNumber?: number;
  /** 实例用户区域层名称（用于Other Outline映射到ECAD层） */
  InstanceUserAreaLayerName?: EDMDName;
  /** 用户属性列表 */
  UserProperties?: EDMDUserSimpleProperty[];
  /** 角色和权限信息 */
  Roles?: RoleOnItemInstance[];
}

/**
 * 项目装配（ItemType="assembly"）
 *
 * @remarks
 * 表示项目的一个或多个实例，包含几何类型和实例列表
 * REF: Section 4.1
 */
export interface EDMDItemAssembly extends EDMDObject {
  /** 项目类型，必须为 "assembly" */
  ItemType: ItemType.ASSEMBLY;
  /** 几何类型（简化方式的关键属性） */
  geometryType?: GeometryType;
  /** 项目唯一标识符 */
  Identifier?: EDMDIdentifier;
  /** 项目实例列表 */
  ItemInstances: EDMDItemInstance[];
  /** 组装到名称（用于相对层/表面定位） */
  AssembleToName?: string;
  /** 参考名称（便于其他项目引用） */
  ReferenceName?: string;
  /** 基线标记 */
  BaseLine?: boolean;
}
```

**总结**：
项目实例和装配层是IDX中实现协作的核心。它通过实例化Item定义，并组合它们形成完整的PCB设计。简化建模通过`geometryType`属性提高了可读性，同时提供了更灵活的相对定位机制（`AssembleToName`和`zOffset`）。传统建模则保持了向后兼容性，但结构较深。



## 曲线集上下边界计算逻辑

根据 **PSI5 IDXv4.5 实施指南**，曲线集（`CurveSet2d`）的 `LowerBound` 和 `UpperBound` 计算方式如下：

### 📐 **计算方式与规则**

#### **1. 基本计算规则**
- `LowerBound` 和 `UpperBound` 定义了曲线在 **Z轴方向的范围**，形成 **2.5D 几何体**（拉伸体）
- 计算单位为 **毫米（mm）**
- Z=0 定义为 **板底部安装面**（BOTTOM surface）
- 正值表示 **向上方向**（远离板底）
- 负值表示 **向下方向**（朝向板底）

```typescript
// 示例：一个1.6mm厚的板
LowerBound = 0      // 板底表面
UpperBound = 1.6    // 板顶表面

// 示例：板底的阻焊层（负Z值）
LowerBound = -0.01  // 低于安装面0.01mm
UpperBound = 0      // 安装面高度
```

#### **2. 使用 `AssembleToName` 时的计算**
当项目（Item）使用 `AssembleToName` 引用一个层或表面时，计算变为 **相对值**：

```typescript
/**
 * 使用 AssembleToName 时的计算逻辑：
 * 
 * 1. 确定参考面（由 AssembleToName 指定）的全局Z坐标
 * 2. LowerBound/UpperBound 变为相对于该参考面的偏移量
 * 3. 最终全局坐标 = 参考面Z坐标 + 偏移量
 */
interface ZCoordinateCalculation {
  // 参考面的全局Z坐标（从层定义或板表面获得）
  referenceZ: number;
  
  // 曲线的相对偏移
  lowerBound: number;  // 相对偏移（可正可负）
  upperBound: number;  // 相对偏移（可正可负）
  
  // 最终全局坐标
  globalLower = referenceZ + lowerBound;
  globalUpper = referenceZ + upperBound;
}
```

#### **3. 具体示例**

**示例1：板子上下边界计算**

```xml
<!-- 1. 定义层堆叠（总厚度1.6mm） -->
<foundation:Item id="STACKUP_PCB" geometryType="LAYER_STACKUP">
  <pdm:ReferenceName>PCB_STACKUP</pdm:ReferenceName>
  <!-- 包含多个层实例，总Z范围0-1.6mm -->
</foundation:Item>

<!-- 2. 板子轮廓引用该层堆叠 -->
<foundation:Item id="BOARD_OUTLINE" geometryType="BOARD_OUTLINE">
  <pdm:AssembleToName>PCB_STACKUP</pdm:AssembleToName>
  <!-- 
  关键：板子CurveSet2d的LowerBound/UpperBound应该为0
  因为厚度已经由层堆叠定义，板子轮廓是2D的
  -->
</foundation:Item>

<!-- 对应的CurveSet2d -->
<foundation:CurveSet2d id="BOARD_CURVESET">
  <d2:LowerBound>0</d2:LowerBound>    <!-- 设为0 -->
  <d2:UpperBound>0</d2:UpperBound>    <!-- 设为0 -->
  <!-- 定义板子2D轮廓的几何 -->
</foundation:CurveSet2d>
```

**示例2：孔跨越多个层**

```xml
<!-- 对应的CurveSet2d - 使用绝对坐标 -->
<foundation:CurveSet2d id="VIA_CURVE_ABS">
  <d2:LowerBound>0.5</d2:LowerBound>    <!-- 全局Z=0.5mm -->
  <d2:UpperBound>0.56</d2:UpperBound>    <!-- 全局Z=0.56mm -->
  <!-- 孔直径等几何定义 -->
</foundation:CurveSet2d>

<!-- 对应的CurveSet2d - 相对坐标 -->
<foundation:CurveSet2d id="VIA_CURVE_REL">
  <!-- 
  相对于INNER_1_TO_2层堆叠的参考面
  假设层堆叠INNER_1_TO_2的Z范围：0.50-0.56mm
  参考面通常取最上表面（0.56mm）
  -->
  <d2:LowerBound>-0.06</d2:LowerBound>  <!-- 0.50 - 0.56 = -0.06 -->
  <d2:UpperBound>0</d2:UpperBound>      <!-- 0.56 - 0.56 = 0 -->
  <!-- 孔直径0.1mm -->
</foundation:CurveSet2d>
```

#### **4. 特殊值处理**

```typescript
/**
 * LowerBound/UpperBound 的特殊值语义
 */
export enum BoundSpecialValues {
  /** 未定义下边界：向下无限延伸 */
  UNDEFINED_LOWER = 'unbounded_bottom',
  /** 未定义上边界：向上无限延伸 */
  UNDEFINED_UPPER = 'unbounded_top',
  /** 值=0且参考面=板底：表示从板底表面开始 */
  BOARD_BOTTOM_SURFACE = 0,
  /** 当 UpperBound=LowerBound 时：表示无限薄的面（如铜箔） */
  ZERO_THICKNESS = 'zero_thickness',
  /** 负值：在参考面下方 */
  BELOW_REFERENCE = 'negative',
  /** 正值：在参考面上方 */
  ABOVE_REFERENCE = 'positive'
}
```

#### **5. 重要注意事项**

1. **参考面选择**：
   - `AssembleToName` 通常引用 **层的上表面**（`UpperBound`）
   - 文档中明确：*"Use the surface of the Layer furthest from the center of the board as the reference"*

2. **负值有效性**：
   - 阻焊层、丝印层等可以在板底表面下方有负值
   - 但物理层（铜层、介电层）通常应为正值

3. **无限边界**：
   - 如文档94页所述，未定义的边界表示 **无限延伸**
   - 常用于禁止区（Keepout）的定义

4. **坐标系一致性**：
   - 确保所有计算使用相同的单位（毫米）
   - Z=0 始终是板底安装面
5. **板子(0,0)的特殊语义**：表示"用AssembleToName引用的实体的厚度拉伸我"
6. **孔必须指定具体范围**：因为孔是预定义的3D实体
7. **过孔计算方法**：
   - 绝对坐标：`LowerBound=0`, `UpperBound=板厚`
   - 相对坐标：需要选择参考面并计算偏移
8. **设计建议**：
   - 板子：总是使用AssembleToName + (0,0)
   - 孔/过孔：优先使用AssembleToName实现自适应设计
   - 参考面选择：建议统一使用**上表面**（TOP）作为参考

这些规则在文档的 **第21-22页（4.1.1节）** 和 **第94-95页（6.5节）** 有详细说明。
