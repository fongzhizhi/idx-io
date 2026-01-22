# IDXv4.5 建模指南梳理
---

## IDX简介

好的，这是一个关于**IDX**的全面介绍。它不仅是一个文件格式，更是电子与机械设计领域协作的**核心协议和语言**。

### 🎯 本质定义

**IDX** 是一种由 **prostep ivip** 国际协会制定的、基于XML的**开放数据交换标准**，全称为 **“ECAD/MCAD Collaboration”**。它的核心使命是**在电子设计自动化（ECAD）系统和机械设计自动化（MCAD）系统之间，实现印刷电路板（PCB）设计数据的无缝、精确和双向协作**。

简单来说，IDX就是**ECAD（如Altium Designer, Cadence Allegro）和MCAD（如SolidWorks, Siemens NX, PTC Creo）都能理解的一种“普通话”**，让电气工程师和机械工程师可以基于同一份数据讨论设计问题。

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

### 总结

**IDX不是一个简单的“导出文件”，而是一套用于ECAD与MCAD间进行精准、高效、双向设计对话的完整协议和数据语言。** 它通过标准化的模型、智能的相对定位和流程化的变更管理，将两个传统上孤立的设计领域紧密连接起来，是现代复杂电子产品实现“机电一体化”设计的基石技术。

您正在开发的 **IDXporter** 项目，正是将这套强大的协作语言赋予您EDA软件的关键桥梁，意义重大。

## 一、IDX 数据结构概览

所有IDX文件都是XML格式，根元素为`EDMDDataSet`：

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

---

## 二、关键ECAD特征建模（第6章重点）

### 1. PCB板建模

**IDXv4.5简化方法（推荐）：使用`geometryType`属性**

```xml
<!-- 简单板（无层定义） -->
<foundation:Item id="BOARD_1" geometryType="BOARD_OUTLINE">
  <foundation:Name>MainBoard</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>BoardOutline_001</foundation:ObjectName>
    </pdm:InstanceName>
    <!-- 板厚属性 -->
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key>
        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>THICKNESS</foundation:ObjectName>
      </property:Key>
      <property:Value>1.6</property:Value>
    </foundation:UserProperty>
  </pdm:ItemInstance>
</foundation:Item>

<!-- 板形状定义（矩形示例） -->
<foundation:ShapeElement id="BOARD_SHAPE">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:DefiningShape>BOARD_CURVESET</pdm:DefiningShape>
  <pdm:Inverted>false</pdm:Inverted>
</foundation:ShapeElement>

<foundation:CurveSet2d id="BOARD_CURVESET" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound><property:Value>0</property:Value></d2:LowerBound>
  <d2:UpperBound><property:Value>1.6</property:Value></d2:UpperBound>
  <d2:DetailedGeometricModelElement>BOARD_POLYLINE</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<foundation:PolyLine id="BOARD_POLYLINE" xsi:type="d2:EDMDPolyLine">
  <d2:Point>PT1</d2:Point>
  <d2:Point>PT2</d2:Point>
  <d2:Point>PT3</d2:Point>
  <d2:Point>PT4</d2:Point>
  <d2:Point>PT1</d2:Point> <!-- 闭合 -->
</foundation:PolyLine>
```

### 2. 电子组件建模

**电气组件：**
```xml
<!-- 组件实例（位置A1） -->
<foundation:Item id="COMP_INST_1" geometryType="COMPONENT">
  <foundation:Name>U1</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>U1</foundation:ObjectName>
    </pdm:InstanceName>
    
    <!-- 元件属性 -->
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key><foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>REFDES</foundation:ObjectName>
      </property:Key>
      <property:Value>U1</property:Value>
    </foundation:UserProperty>
    
    <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
      <property:Key><foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
        <foundation:ObjectName>PARTNUM</foundation.ObjectName>
      </property:Key>
      <property:Value>STM32F407</property:Value>
    </foundation:UserProperty>
    
    <!-- 位置变换（2D变换） -->
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.0</pdm:xx><pdm:xy>0.0</pdm:xy>
      <pdm:yx>0.0</pdm:yx><pdm:yy>1.0</pdm:yy>
      <pdm:tx><property:Value>25.4</property:Value></pdm:tx>
      <pdm:ty><property:Value>15.2</property:Value></pdm:ty>
    </pdm:Transformation>
    
    <!-- 引用组件定义 -->
    <pdm:Item>COMP_DEF_QFP64</pdm:Item>
  </pdm:ItemInstance>
  
  <!-- 安装在顶层 -->
  <pdm:AssembleToName>TOP</pdm:AssembleToName>
</foundation:Item>

<!-- 组件定义 -->
<foundation:Item id="COMP_DEF_QFP64">
  <foundation:Name>QFP64_Package</foundation:Name>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:PackageName>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>QFP64_10X10</foundation:ObjectName>
  </pdm:PackageName>
  <pdm:Shape>COMP_SHAPE_QFP64</pdm:Shape>
  
  <!-- 引脚定义（IDXv4.5新增） -->
  <pdm:PackagePin pinNumber="1" primary="true">
    <d2:Point>PIN1_PT</d2:Point>
    <pdm:Shape>PIN_SHAPE_1</pdm:Shape>
  </pdm:PackagePin>
</foundation:Item>
```

**机械组件：**
```xml
<foundation:Item id="MECH_COMP_INST" geometryType="COMPONENT_MECHANICAL">
  <!-- 与电气组件类似，但通常没有电气属性 -->
</foundation:Item>
```

### 3. 孔建模

**金属化孔（PTH）：**
```xml
<foundation:Item id="PTH_1" geometryType="HOLE_PLATED">
  <foundation:Name>MH1</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>MH1</foundation:ObjectName>
    </pdm:InstanceName>
    
    <!-- 位置 -->
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1.0</pdm:xx><pdm:xy>0.0</pdm:xy>
      <pdm:yx>0.0</pdm:yx><pdm:yy>1.0</pdm:yy>
      <pdm:tx><property:Value>50.0</property:Value></pdm:tx>
      <pdm:ty><property:Value>30.0</property:Value></pdm:ty>
    </pdm:Transformation>
    
    <pdm:Item>HOLE_DEF_3MM</pdm:Item>
  </pdm:ItemInstance>
</foundation:Item>

<!-- 孔定义（圆形） -->
<foundation:Item id="HOLE_DEF_3MM">
  <foundation:Name>3mm_Plated_Hole</foundation:Name>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>HOLE_SHAPE_3MM</pdm:Shape>
</foundation:Item>

<foundation:ShapeElement id="HOLE_SHAPE_3MM">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:DefiningShape>HOLE_CURVESET</pdm:DefiningShape>
  <pdm:Inverted>true</pdm:Inverted> <!-- 孔是切除材料 -->
</foundation:ShapeElement>

<foundation:CurveSet2d id="HOLE_CURVESET" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound><property:Value>0</property:Value></d2:LowerBound>
  <d2:UpperBound><property:Value>1.6</property:Value></d2:UpperBound>
  <d2:DetailedGeometricModelElement>HOLE_CIRCLE</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<foundation:CircleCenter id="HOLE_CIRCLE" xsi:type="d2:EDMDCircleCenter">
  <d2:CenterPoint>
    <d2:X><property:Value>0</property:Value></d2:X>
    <d2:Y><property:Value>0</property:Value></d2:Y>
  </d2:CenterPoint>
  <d2:Diameter><property:Value>3.0</property:Value></d2:Diameter>
</foundation:CircleCenter>
```

**非金属化孔（NPTH）：**
```xml
<foundation:Item id="NPTH_1" geometryType="HOLE_NON_PLATED">
  <!-- 与PTH类似，geometryType不同 -->
</foundation:Item>
```

### 4. 禁止区与保留区

**组件禁止区：**
```xml
<foundation:Item id="KEEPOUT_1" geometryType="KEEPOUT_AREA_COMPONENT">
  <foundation:Name>NoComponentArea</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>KO1</foundation:ObjectName>
    </pdm:InstanceName>
    <pdm:Item>KEEPOUT_DEF</pdm:Item>
  </pdm:ItemInstance>
  <pdm:AssembleToName>TOP</pdm:AssembleToName>
</foundation:Item>

<!-- Z轴范围：从板表面向上10mm -->
<foundation:CurveSet2d id="KO_CURVESET" xsi:type="d2:EDMDCurveSet2d">
  <d2:LowerBound><property:Value>0</property:Value></d2:LowerBound>
  <d2:UpperBound><property:Value>10.0</property:Value></d2:UpperBound>
  <!-- 形状定义 -->
</foundation:CurveSet2d>
```

**布线禁止区：**
```xml
<foundation:Item id="ROUTE_KO" geometryType="KEEPOUT_AREA_ROUTE">
  <!-- 类似组件禁止区 -->
</foundation:Item>
```

**保留区（必须放置区域）：**
```xml
<foundation:Item id="KEEPIN_1" geometryType="KEEPIN_AREA_COMPONENT">
  <!-- 与禁止区类似，逻辑相反 -->
</foundation:Item>
```

### 5. 铣削切口

**非金属化铣削切口：**
```xml
<foundation:Item id="MILLED_CUTOUT" geometryType="HOLE_NONPLATED_MILLED">
  <foundation:Name>Slot1</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance>
    <pdm:InstanceName>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>MILLED_SLOT</foundation:ObjectName>
    </pdm:InstanceName>
    <pdm:Item>MILLED_DEF</pdm:Item>
  </pdm:ItemInstance>
</foundation:Item>

<!-- 铣削路径定义 -->
<foundation:PolyLine id="MILLED_PATH" xsi:type="d2:EDMDPolyLine">
  <d2:Thickness><property:Value>2.0</property:Value></d2:Thickness>
  <d2:Point>PT_S1</d2:Point>
  <d2:Point>PT_S2</d2:Point>
  <d2:Point>PT_S3</d2:Point>
</foundation:PolyLine>
```

---

## 三、几何形状表示（第7章重点）

### 1. 2.5D几何基础

所有形状通过`CurveSet2d`定义，包含：
- `LowerBound`/`UpperBound`：Z轴范围
- `DetailedGeometricModelElement`：2D轮廓曲线

```xml
<foundation:CurveSet2d id="SHAPE_1" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound><property:Value>0</property:Value></d2:LowerBound>  <!-- Z起点 -->
  <d2:UpperBound><property:Value>2.0</property:Value></d2:UpperBound> <!-- Z终点 -->
  <d2:DetailedGeometricModelElement>POLYLINE_1</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>
```

### 2. 支持的曲线类型

#### a) 多段线（最常用）
```xml
<foundation:PolyLine id="POLYLINE_1" xsi:type="d2:EDMDPolyLine">
  <!-- 可选：线宽（用于铣削路径） -->
  <d2:Thickness><property:Value>0.0</property:Value></d2:Thickness>
  
  <!-- 点序列（必须闭合形成区域） -->
  <d2:Point>PT_1</d2:Point>
  <d2:Point>PT_2</d2:Point>
  <d2:Point>PT_3</d2:Point>
  <d2:Point>PT_4</d2:Point>
  <d2:Point>PT_1</d2:Point> <!-- 闭合 -->
</foundation:PolyLine>

<!-- 点定义 -->
<foundation:CartesianPoint id="PT_1" xsi:type="d2:EDMDCartesianPoint">
  <d2:X><property:Value>0.0</property:Value></d2:X>
  <d2:Y><property:Value>0.0</property:Value></d2:Y>
</foundation:CartesianPoint>
```

#### b) 圆形
```xml
<!-- 通过中心点和直径定义 -->
<foundation:CircleCenter id="CIRCLE_1" xsi:type="d2:EDMDCircleCenter">
  <d2:CenterPoint>
    <d2:X><property:Value>10.0</property:Value></d2:X>
    <d2:Y><property:Value>10.0</property:Value></d2:Y>
  </d2:CenterPoint>
  <d2:Diameter><property:Value>5.0</property:Value></d2:Diameter>
</foundation:CircleCenter>

<!-- 通过三点定义 -->
<foundation:Circle3Point id="CIRCLE_2" xsi:type="d2:EDMDCircle3Point">
  <d2:Point1>PT_A</d2:Point1>
  <d2:Point2>PT_B</d2:Point2>
  <d2:Point3>PT_C</d2:Point3>
</foundation:Circle3Point>
```

#### c) 圆弧
```xml
<foundation:Arc id="ARC_1" xsi:type="d2:EDMDArc">
  <d2:StartPoint>PT_START</d2:StartPoint>
  <d2:EndPoint>PT_END</d2:EndPoint>
  <d2:Radius><property:Value>8.0</property:Value></d2:Radius>
  <d2:IsCCW>true</d2:IsCCW> <!-- true=逆时针 -->
</foundation:Arc>
```

#### d) B样条曲线
```xml
<foundation:BSplineCurve id="BSPLINE_1" xsi:type="d2:EDMDBSplineCurve">
  <d2:Degree>3</d2:Degree>
  <d2:ControlPointsList>
    <d2:ControlPoint>CP1</d2:ControlPoint>
    <d2:ControlPoint>CP2</d2:ControlPoint>
    <d2:ControlPoint>CP3</d2:ControlPoint>
    <d2:ControlPoint>CP4</d2:ControlPoint>
  </d2:ControlPointsList>
  <d2:ClosedCurve>false</d2:ClosedCurve>
</foundation:BSplineCurve>
```

#### e) 椭圆
```xml
<foundation:Ellipse id="ELLIPSE_1" xsi:type="d2:EDMDEllipse">
  <d2:CenterPoint>ELLIPSE_CENTER</d2:CenterPoint>
  <d2:SemiMajor><property:Value>6.0</property:Value></d2:SemiMajor>
  <d2:SemiMinor><property:Value>3.0</property:Value></d2:SemiMinor>
  <d2:OrientationAngle><property:Value>30.0</property:Value></d2:OrientationAngle>
</foundation:Ellipse>
```

#### f) 复合曲线（多个曲线组合）
```xml
<foundation:CompositeCurve id="COMPOSITE_1" xsi:type="d2:EDMDCompositeCurve">
  <d2:CurveSegment>POLYLINE_SEG1</d2:CurveSegment>
  <d2:CurveSegment>ARC_SEG1</d2:CurveSegment>
  <d2:CurveSegment>POLYLINE_SEG2</d2:CurveSegment>
</foundation:CompositeCurve>
```

### 3. 布尔运算（CSG构造）

通过`ShapeElement`的`Inverted`属性控制：

```xml
<!-- 添加材料（默认） -->
<foundation:ShapeElement id="SHAPE_ADD">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:DefiningShape>CURVESET_ADD</pdm:DefiningShape>
  <pdm:Inverted>false</pdm:Inverted> <!-- 或省略 -->
</foundation:ShapeElement>

<!-- 切除材料（孔、切口等） -->
<foundation:ShapeElement id="SHAPE_CUT">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:DefiningShape>CURVESET_CUT</pdm:DefiningShape>
  <pdm:Inverted>true</pdm:Inverted>
</foundation:ShapeElement>
```

### 4. 外部文件引用（隐式形状）

```xml
<foundation:Item id="COMPLEX_SHAPE" geometryType="COMPONENT">
  <pdm:ItemType>single</pdm:ItemType>
  <!-- 引用外部3D模型 -->
  <pdm:EDMD3DModel>EXTERNAL_MODEL_1</pdm:EDMD3DModel>
</foundation:Item>

<foundation:Model3D id="EXTERNAL_MODEL_1">
  <pdm:ModelIdentifier>capacitor.step</pdm:ModelIdentifier>
  <pdm:ModelLocation>/models/</pdm:ModelLocation>
  <pdm:MCADFormat>STEP</pdm:MCADFormat>
  <pdm:MCADFormatVersion>AP214</pdm:MCADFormatVersion>
  <!-- 对齐变换（可选） -->
  <pdm:Transformation>
    <pdm:TransformationType>d3</pdm:TransformationType>
    <pdm:tx><property:Value>0.5</property:Value></pdm:tx>
    <pdm:ty><property:Value>0.5</property:Value></pdm:ty>
  </pdm:Transformation>
</foundation:Model3D>
```

## 四、完整示例：简单PCB板

```xml
<foundation:EDMDDataSet xmlns:foundation="..." xmlns:pdm="..." xmlns:d2="..." xmlns:property="...">
  
  <foundation:Header>
    <foundation:CreatorCompany>ExampleCorp</foundation:CreatorCompany>
    <foundation:GlobalUnitLength>UNIT_MM</foundation:GlobalUnitLength>
    <foundation:CreationDateTime>2024-01-15T14:30:00Z</foundation:CreationDateTime>
  </foundation:Header>
  
  <foundation:Body>
    <!-- 1. 板定义 -->
    <foundation:Item id="BOARD_ASSEMBLY" geometryType="BOARD_OUTLINE">
      <foundation:Name>MainBoard</foundation:Name>
      <pdm:ItemType>assembly</pdm:ItemType>
      <pdm:ItemInstance>
        <pdm:InstanceName>
          <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
          <foundation:ObjectName>PCB_Assembly</foundation:ObjectName>
        </pdm:InstanceName>
        <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
          <property:Key>
            <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
            <foundation:ObjectName>THICKNESS</foundation:ObjectName>
          </property:Key>
          <property:Value>1.6</property:Value>
        </foundation:UserProperty>
        <pdm:Item>BOARD_SHAPE_ITEM</pdm:Item>
      </pdm:ItemInstance>
    </foundation:Item>
    
    <!-- 2. 组件 -->
    <foundation:Item id="COMP_U1" geometryType="COMPONENT">
      <foundation:Name>U1</foundation:Name>
      <pdm:ItemType>assembly</pdm:ItemType>
      <pdm:ItemInstance>
        <pdm:InstanceName>
          <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
          <foundation:ObjectName>IC1</foundation:ObjectName>
        </pdm:InstanceName>
        <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
          <property:Key>
            <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
            <foundation:ObjectName>REFDES</foundation:ObjectName>
          </property:Key>
          <property:Value>U1</property:Value>
        </foundation:UserProperty>
        <pdm:Transformation>
          <pdm:TransformationType>d2</pdm:TransformationType>
          <pdm:xx>1.0</pdm:xx><pdm:xy>0.0</pdm:xy>
          <pdm:yx>0.0</pdm:yx><pdm:yy>1.0</pdm:yy>
          <pdm:tx><property:Value>20.0</property:Value></pdm:tx>
          <pdm:ty><property:Value>15.0</property:Value></pdm:ty>
        </pdm:Transformation>
        <pdm:Item>COMP_DEF_SOIC8</pdm:Item>
      </pdm:ItemInstance>
      <pdm:AssembleToName>TOP</pdm:AssembleToName>
    </foundation:Item>
    
    <!-- 3. 安装孔 -->
    <foundation:Item id="HOLE_M1" geometryType="HOLE_PLATED">
      <foundation:Name>MH1</foundation:Name>
      <pdm:ItemType>assembly</pdm:ItemType>
      <pdm:ItemInstance>
        <pdm:InstanceName>
          <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
          <foundation:ObjectName>MountingHole1</foundation:ObjectName>
        </pdm:InstanceName>
        <pdm:Transformation>
          <pdm:TransformationType>d2</pdm:TransformationType>
          <pdm:xx>1.0</pdm:xx><pdm:xy>0.0</pdm:xy>
          <pdm:yx>0.0</pdm:yx><pdm:yy>1.0</pdm:yy>
          <pdm:tx><property:Value>5.0</property:Value></pdm:tx>
          <pdm:ty><property:Value>5.0</property:Value></pdm:ty>
        </pdm:Transformation>
        <pdm:Item>HOLE_DEF_3MM</pdm:Item>
      </pdm:ItemInstance>
    </foundation:Item>
    
    <!-- 4. 形状定义（简化） -->
    <foundation:ShapeElement id="BOARD_SHAPE">
      <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
      <pdm:DefiningShape>BOARD_CURVES</pdm:DefiningShape>
      <pdm:Inverted>false</pdm:Inverted>
    </foundation:ShapeElement>
    
    <foundation:CurveSet2d id="BOARD_CURVES" xsi:type="d2:EDMDCurveSet2d">
      <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
      <d2:LowerBound><property:Value>0</property:Value></d2:LowerBound>
      <d2:UpperBound><property:Value>1.6</property:Value></d2:UpperBound>
      <d2:DetailedGeometricModelElement>BOARD_OUTLINE_POLY</d2:DetailedGeometricModelElement>
    </foundation:CurveSet2d>
    
    <!-- 更多形状定义... -->
  </foundation:Body>
  
  <foundation:ProcessInstruction xsi:type="computational:EDMDProcessInstructionSendInformation"/>
</foundation:EDMDDataSet>
```

---

## 五、建模要点总结

### 1. **IDXv4.5 简化表示法优先**
- 使用 `geometryType` 属性代替复杂嵌套对象
- 支持的类型：`BOARD_OUTLINE`, `COMPONENT`, `HOLE_PLATED`, `KEEPOUT_AREA_ROUTE` 等

### 2. **Z轴定位规则**
- 板底面（BOTTOM）= Z=0
- 板顶面（TOP）= Z=板厚
- 使用 `AssembleToName` 相对层定位
- IDXv4.5新增 `zOffset` 属性精细控制

### 3. **形状建模流程**
1. 定义 `Item`（使用 `geometryType`）
2. 定义 `ItemInstance`（包含变换）
3. 定义 `ShapeElement`（设置 `Inverted`）
4. 定义 `CurveSet2d`（设置Z范围）
5. 定义曲线（PolyLine、Circle等）

### 4. **单位与精度**
- 默认单位：毫米（mm）
- 角度单位：度（°）
- 建议精度：0.001mm

### 5. **文件输出**
- 扩展名：`.idx`（未压缩）或 `.idz`（压缩）
- 推荐命名：`DesignName_baseline_v1.idx`

---

## 六、geometryType 类型参考

根据《PSI5_IDXv4.5_Implementation_Guidelines.pdf》文档，IDXv4.5协议中引入的 `geometryType` 属性用于简化ECAD/MCAD协作中各种特征的描述。以下是文档中提到的所有 `geometryType` 类型及其简要说明，按类别整理：

---

### ✅ 一、板级轮廓与区域类型
| geometryType           | 描述                       | 对应传统对象（可省略）                      |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `BOARD_OUTLINE`        | 板框轮廓（简单板）         | `EDMDStratum`                               |
| `BOARD_AREA_FLEXIBLE`  | 柔性区域（在层区域中定义） | `EDMDFunctionalItemShape`（`FlexibleArea`） |
| `BOARD_AREA_STIFFENER` | 加强区域                   | `EDMDFunctionalItemShape`（`Stiffener`）    |
| `BOARD_AREA_RIGID`     | 刚性区域（默认）           | `EDMDFunctionalItemShape`（`RigidArea`）    |

---

### ✅ 二、组件类型
| geometryType           | 描述                       | 对应传统对象（可省略）                      |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `COMPONENT`            | 电气组件（PCB元件）        | `EDMDAssemblyComponent`（`Physical`）       |
| `COMPONENT_MECHANICAL` | 机械组件（如散热片、支架） | `EDMDAssemblyComponent`（`MechanicalItem`） |

---

### ✅ 三、孔与过孔类型
| geometryType            | 描述                 | 对应传统对象（可省略）                               |
| ----------------------- | -------------------- | ---------------------------------------------------- |
| `HOLE_PLATED`           | 金属化孔（如PTH）    | `EDMDInterStratumFeature`（`PlatedCutout`）          |
| `HOLE_NON_PLATED`       | 非金属化孔（如NPTH） | `EDMDInterStratumFeature`（`Cutout`）                |
| `HOLE_PLATED_MILLED`    | 金属化铣切孔         | `EDMDInterStratumFeature`（`PartiallyPlatedCutout`） |
| `HOLE_NONPLATED_MILLED` | 非金属化铣切孔       | `EDMDInterStratumFeature`（`MilledCutout`）          |
| `VIA`                   | 过孔（信号孔）       | `EDMDInterStratumFeature`（`Via`）                   |
| `FILLED_VIA`            | 填充过孔             | `EDMDInterStratumFeature`（`FilledVia`）             |

---

### ✅ 四、禁布区（Keepout）类型
| geometryType             | 描述                  | 对应传统对象（可省略）                        |
| ------------------------ | --------------------- | --------------------------------------------- |
| `KEEPOUT_AREA_ROUTE`     | 布线禁布区            | `EDMDKeepOut`（`Purpose=Route`）              |
| `KEEPOUT_AREA_COMPONENT` | 组件放置禁布区        | `EDMDKeepOut`（`Purpose=ComponentPlacement`） |
| `KEEPOUT_AREA_VIA`       | 过孔禁布区            | `EDMDKeepOut`（`Purpose=Via`）                |
| `KEEPOUT_AREA_TESTPOINT` | 测试点禁布区          | `EDMDKeepOut`（`Purpose=TestPoint`）          |
| `KEEPOUT_AREA_OTHER`     | 其他禁布区            | `EDMDKeepOut`（`Purpose=Other`）              |
| `KEEPOUT_AREA_THERMAL`   | 热禁布区（表6中列出） | `EDMDKeepOut`（`Purpose=Thermal`）            |

---

### ✅ 五、保留区（Keepin）类型
| geometryType            | 描述           | 对应传统对象（可省略）                       |
| ----------------------- | -------------- | -------------------------------------------- |
| `KEEPIN_AREA_ROUTE`     | 布线保留区     | `EDMDKeepIn`（`Purpose=Route`）              |
| `KEEPIN_AREA_COMPONENT` | 组件放置保留区 | `EDMDKeepIn`（`Purpose=ComponentPlacement`） |
| `KEEPIN_AREA_VIA`       | 过孔保留区     | `EDMDKeepIn`（`Purpose=Via`）                |
| `KEEPIN_AREA_TESTPOINT` | 测试点保留区   | `EDMDKeepIn`（`Purpose=TestPoint`）          |
| `KEEPIN_AREA_OTHER`     | 其他保留区     | `EDMDKeepIn`（`Purpose=Other`）              |

---

### ✅ 六、其他区域类型
| geometryType           | 描述                                   | 对应传统对象（可省略）                            |
| ---------------------- | -------------------------------------- | ------------------------------------------------- |
| `PLACEMENT_GROUP_AREA` | 放置组区域（相关组件分组）             | `EDMDFunctionalItemShape`（`PlacementGroupArea`） |
| `OTHER_OUTLINE`        | 其他轮廓（用户自定义区域，如Logo位置） | `EDMDFunctionalItemShape`（`UserArea`）           |
| `BEND`                 | 弯曲区域（柔性板弯曲定义）             | `EDMDBend`                                        |

---

### ✅ 七、铜层与图形类型
| geometryType   | 描述               | 对应传统对象（可省略）                       |
| -------------- | ------------------ | -------------------------------------------- |
| `COPPER_PAD`   | 铜焊盘             | `EDMDStratum` + `LayerPurpose=LandsOnly`     |
| `COPPER_TRACE` | 铜走线             | `EDMDStratum` + `LayerPurpose=OtherSignal`   |
| `COPPER_AREA`  | 铜区域（如电源层） | `EDMDStratum` + `LayerPurpose=PowerOrGround` |
| `SOLDERMASK`   | 阻焊层             | `EDMDStratum` + `LayerPurpose=SolderMask`    |
| `SILKSCREEN`   | 丝印层             | `EDMDStratum` + `LayerPurpose=Silkscreen`    |

---

### ✅ 八、物理层类型（用于层叠结构定义）
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

---

### ✅ 九、备注说明
- **简化方法**：在IDXv4.5中，只要在顶层的 `EDMDItem`（`ItemType="assembly"`）上指定 `geometryType`，即可省略传统的中间对象（如 `EDMDKeepOut`、`EDMDAssemblyComponent` 等），直接引用形状元素（`ShapeElement`）。
- **向后兼容**：IDXv4.5支持传统方法和简化方法，但**推荐使用简化方法**以减少XML文件大小和复杂度。
- **文档依据**：以上列表整理自文档第6节（各特征建模）、表4（物理层类型）、表6-7（禁布/保留区类型）、表8（所有项目类型总结）以及第9节（属性术语表）。

---

如果需要了解某个具体 `geometryType` 的XML示例或使用场景，请随时提问，我可以从文档中提取对应片段进行解释。

**使用建议**：始终优先使用IDXv4.5的简化表示法（`geometryType`），它更简洁且向前兼容。对于复杂形状，可使用复合曲线或外部3D模型引用。

## 七、对于板子的建模

板子有四种定义类型：

| geometryType           | 描述                       | 对应传统对象（可省略）                      |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `BOARD_OUTLINE`        | 板框轮廓（简单板）         | `EDMDStratum`                               |
| `BOARD_AREA_FLEXIBLE`  | 柔性区域（在层区域中定义） | `EDMDFunctionalItemShape`（`FlexibleArea`） |
| `BOARD_AREA_STIFFENER` | 加强区域                   | `EDMDFunctionalItemShape`（`Stiffener`）    |
| `BOARD_AREA_RIGID`     | 刚性区域（默认）           | `EDMDFunctionalItemShape`（`RigidArea`）    |

本项目只专注让`BOARD_OUTLINE`和`BOARD_AREA_RIGID`两种类型，我根据文档第46-61页详细解释这两种类型的区别和应用场景：

### 📊 **核心区别总结**

| 特性           | `BOARD_OUTLINE` | `BOARD_AREA_RIGID` |
| -------------- | --------------- | ------------------ |
| **定义对象**   | 简单板子整体    | 板子内的特定区域   |
| **层次级别**   | 板子顶级定义    | 板子内部区域定义   |
| **层堆叠关联** | 无（直接厚度）  | 必须关联层堆叠     |
| **Z轴参考**    | 绝对Z坐标       | 相对层堆叠         |
| **典型应用**   | 单层/简单板     | 多层板、刚柔结合板 |
| **几何形状**   | 整个板子轮廓    | 板子内部某区域轮廓 |

### 📖 **详细解释**

#### **1. BOARD_OUTLINE（简单板子）**
- **文档参考**：第46-48页
- **定义**：描述整个PCB板的**外部轮廓和整体厚度**
- **特点**：
  - 使用`LowerBound`/`UpperBound`定义绝对Z范围
  - 通常`LowerBound=0`, `UpperBound=厚度`
  - **没有**`AssembleToName`属性
  - 适用于单层板或不需要分层详细信息的板子

**示例结构**：
```xml
<foundation:Item geometryType="BOARD_OUTLINE">
  <!-- 直接定义厚度：0-1.6mm -->
  <pdm:ItemInstance>
    <pdm:Item>板子定义</pdm:Item>
    <!-- 2D变换定义位置 -->
  </pdm:ItemInstance>
  <!-- 没有AssembleToName！ -->
</foundation:Item>
```

#### **2. BOARD_AREA_RIGID（刚性区域）**

- **文档参考**：第58-60页
- **定义**：描述**板子内部的一个区域**，该区域使用特定的层堆叠
- **特点**：
  - **必须**通过`AssembleToName`关联到一个层堆叠（Layer Stackup）
  - 几何形状定义该区域的XY范围
  - Z范围由关联的层堆叠决定
  - 用于多层板、刚柔结合板的不同区域

**示例结构**：
```xml
<foundation:Item geometryType="BOARD_AREA_RIGID">
  <pdm:ItemInstance>
    <pdm:Item>区域定义</pdm:Item>
  </pdm:ItemInstance>
  <!-- 关键：关联到层堆叠 -->
  <pdm:AssembleToName>PRIMARY_STACKUP</pdm:AssembleToName>
</foundation:Item>
```

### 🔄 **实际应用场景**

#### **场景1：简单单层板**
```xml
<!-- 整个板子就是一个BOARD_OUTLINE -->
<foundation:Item geometryType="BOARD_OUTLINE">
  <foundation:Name>SimpleBoard</foundation:Name>
  <!-- 厚度1.6mm -->
</foundation:Item>
```

#### **场景2：多层板（全部刚性）**
```xml
<!-- 定义层堆叠 -->
<foundation:Item geometryType="LAYER_STACKUP" id="MAIN_STACKUP">
  <pdm:ReferenceName>MAIN_STACKUP</pdm:ReferenceName>
  <!-- 包含多个层定义 -->
</foundation:Item>

<!-- 整个板子区域（使用该层堆叠） -->
<foundation:Item geometryType="BOARD_AREA_RIGID">
  <foundation:Name>MainBoardArea</foundation:Name>
  <pdm:AssembleToName>MAIN_STACKUP</pdm:AssembleToName>
</foundation:Item>
```

#### **场景3：刚柔结合板**（图25，第50页）
```xml
<!-- 刚性区域1 -->
<foundation:Item geometryType="BOARD_AREA_RIGID">
  <foundation:Name>RigidArea1</foundation:Name>
  <pdm:AssembleToName>RIGID_STACKUP</pdm:AssembleToName>
</foundation:Item>

<!-- 柔性区域 -->
<foundation:Item geometryType="BOARD_AREA_FLEXIBLE">
  <foundation:Name>FlexArea</foundation:Name>
  <pdm:AssembleToName>FLEX_STACKUP</pdm:AssembleToName>
</foundation:Item>

<!-- 刚性区域2 -->
<foundation:Item geometryType="BOARD_AREA_RIGID">
  <foundation:Name>RigidArea2</foundation:Name>
  <pdm:AssembleToName>RIGID_STACKUP</pdm:AssembleToName>
</foundation:Item>
```

### ❓ **常见问题澄清**

#### **Q：有层堆叠信息时，还能用BOARD_OUTLINE吗？**
**A：可以，但不推荐**。`BOARD_OUTLINE`是旧式简单表示。如果板子有分层，建议使用`BOARD_AREA_RIGID`和相关层定义。

#### **Q：一个板子可以同时有BOARD_OUTLINE和BOARD_AREA_RIGID吗？**
**A：不可以**。它们是互斥的板子表示方式：
- `BOARD_OUTLINE`：完整板子的简单表示
- `BOARD_AREA_RIGID`：板子内部区域的详细表示

#### **Q：如何选择？**
| 条件                   | 选择                                       |
| ---------------------- | ------------------------------------------ |
| 单层板，无详细层信息   | `BOARD_OUTLINE`                            |
| 多层板，需要详细层信息 | `BOARD_AREA_RIGID` + `LAYER_STACKUP`       |
| 刚柔结合板             | `BOARD_AREA_RIGID` + `BOARD_AREA_FLEXIBLE` |
| 有不同厚度区域         | 多个`BOARD_AREA_*`区域                     |

### 📝 **总结**

你的理解**方向正确但需微调**：
- ✅ `BOARD_OUTLINE`：简单板，无层堆叠
- ✅ `BOARD_AREA_RIGID`：复杂板的一部分，关联层堆叠
- ❌ 不是"有`AssembleToName`就是`BOARD_AREA_RIGID`"，而是**需要关联层堆叠时才用`BOARD_AREA_RIGID`**

**简单记忆**：

- **简单板** → `BOARD_OUTLINE`（就像你的demo）
- **复杂板（有层）** → `BOARD_AREA_RIGID` + `LAYER_STACKUP`

## 八、关于Item的结构

您的问题非常好，这触及了 IDX 协议中**核心数据模型**的设计。让我详细解释。

### 🔍 **传统结构与简化结构的对比**

#### **1. 传统结构（IDXv4.0之前）**

```
Item(assembly) → Item(single) → "Third Item" → ShapeElement → CurveSet2D → Geometry → Points
```

这里的 **"Third Item"** 指的是具体描述项目**类型和特性**的**中介对象**：

| 项目类型              | "Third Item" 对象         | 作用                           |
| --------------------- | ------------------------- | ------------------------------ |
| **板（Board）**       | `EDMDStratum`             | 定义层类型（如设计层、文档层） |
| **元件（Component）** | `EDMDAssemblyComponent`   | 定义是电气/机械元件            |
| **禁布区（Keepout）** | `EDMDKeepOut`             | 定义禁布类型（布线、元件等）   |
| **保持区（Keepin）**  | `EDMDKeepIn`              | 定义保持类型                   |
| **钻孔（Hole）**      | `EDMDInterStratumFeature` | 定义孔类型（电镀/非电镀）      |
| **铣削切口**          | `EDMDInterStratumFeature` | 定义铣削类型                   |
| **柔性板弯曲**        | `EDMDFunctionalItemShape` | 定义弯曲特性                   |

#### **2. 简化结构（IDXv4.0引入）**

```
Item(assembly) [geometryType="..."] → Item(single) → ShapeElement → CurveSet2D → Geometry → Points
```

**"Third Item"被省略了**，它的信息现在由 **`geometryType` 属性**直接表示。

---

### 📊 **完整结构链对比**

#### **CurveSet2D 之后的完整结构链：**
```
CurveSet2D → DetailedGeometricModelElement → 2D几何曲线 → Points
```
具体可以是：
- **曲线类型**：`PolyLine`、`Arc`、`Circle`、`Ellipse`、`BSplineCurve` 等
- **曲线参数**：点、半径、角度、控制点等
- **厚度属性**：`Thickness`（可选，用于走线、铣削路径等）

---

### 📝 **案例对比：一个矩形板**

#### **案例1：使用 `geometryType`（简化方式）**

```xml
<!-- 顶层项目：板轮廓 -->
<foundation:Item id="ITEM_BOARD_ASSY" geometryType="BOARD_OUTLINE">
  <foundation:Name>My PCB Board</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 实例 -->
  <pdm:ItemInstance>
    <pdm:Item>ITEM_BOARD_DEF</pdm:Item>
    <pdm:InstanceName>BoardInstance1</pdm:InstanceName>
  </pdm:ItemInstance>
</foundation:Item>

<!-- 板定义 -->
<foundation:Item id="ITEM_BOARD_DEF">
  <foundation:Name>Board Definition</foundation:Name>
  <pdm:ItemType>single</pdm:ItemType>
  <!-- 直接引用ShapeElement -->
  <pdm:Shape>SHAPE_BOARD</pdm:Shape>
</foundation:Item>

<!-- ShapeElement -->
<foundation:ShapeElement id="SHAPE_BOARD">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:Inverted>false</pdm:Inverted>
  <pdm:DefiningShape>CURVESET_BOARD</pdm:DefiningShape>
</foundation:ShapeElement>

<!-- CurveSet2D -->
<foundation:CurveSet2d id="CURVESET_BOARD">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound>0</d2:LowerBound>
  <d2:UpperBound>1.6</d2:UpperBound>
  <d2:DetailedGeometricModelElement>POLY_BOARD</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<!-- 矩形轮廓 -->
<foundation:PolyLine id="POLY_BOARD">
  <d2:Point>PT1</d2:Point>
  <d2:Point>PT2</d2:Point>
  <d2:Point>PT3</d2:Point>
  <d2:Point>PT4</d2:Point>
  <d2:Point>PT1</d2:Point>
</foundation:PolyLine>
```

#### **案例2：不使用 `geometryType`（传统方式）**

```xml
<!-- 顶层项目：板轮廓 -->
<foundation:Item id="ITEM_BOARD_ASSY">
  <foundation:Name>My PCB Board</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  
  <!-- 实例 -->
  <pdm:ItemInstance>
    <pdm:Item>ITEM_BOARD_DEF</pdm:Item>
    <pdm:InstanceName>BoardInstance1</pdm:InstanceName>
  </pdm:ItemInstance>
</foundation:Item>

<!-- 板定义 -->
<foundation:Item id="ITEM_BOARD_DEF">
  <foundation:Name>Board Definition</foundation:Name>
  <pdm:ItemType>single</pdm:ItemType>
  <!-- 引用 Stratum 对象，而不是 ShapeElement -->
  <pdm:Shape>STRATUM_BOARD</pdm:Shape>
</foundation:Item>

<!-- "Third Item": Stratum 对象 -->
<foundation:Stratum id="STRATUM_BOARD">
  <!-- Stratum 引用 ShapeElement -->
  <pdm:ShapeElement>SHAPE_BOARD</pdm:ShapeElement>
  <!-- Stratum 提供额外信息 -->
  <pdm:StratumType>DesignLayerStratum</pdm:StratumType>
  <pdm:StratumSurfaceDesignation>PrimarySurface</pdm:StratumSurfaceDesignation>
</foundation:Stratum>

<!-- ShapeElement 及之后的部分相同 -->
<foundation:ShapeElement id="SHAPE_BOARD">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:Inverted>false</pdm:Inverted>
  <pdm:DefiningShape>CURVESET_BOARD</pdm:DefiningShape>
</foundation:ShapeElement>

<!-- CurveSet2D 及之后的部分相同 -->
<foundation:CurveSet2d id="CURVESET_BOARD">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound>0</d2:LowerBound>
  <d2:UpperBound>1.6</d2:UpperBound>
  <d2:DetailedGeometricModelElement>POLY_BOARD</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<!-- 矩形轮廓 -->
<foundation:PolyLine id="POLY_BOARD">
  <d2:Point>PT1</d2:Point>
  <d2:Point>PT2</d2:Point>
  <d2:Point>PT3</d2:Point>
  <d2:Point>PT4</d2:Point>
  <d2:Point>PT1</d2:Point>
</foundation:PolyLine>
```

---

### 📊 **对比总结**

| 方面           | **传统方式（无 geometryType）**                            | **简化方式（有 geometryType）**                 |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| **结构链长度** | 6层：Item→Item→Third Item→ShapeElement→CurveSet2D→Geometry | 5层：Item→Item→ShapeElement→CurveSet2D→Geometry |
| **文件大小**   | 较大（多一层 XML）                                         | 较小（减少约 20-30% XML）                       |
| **可读性**     | 较差（需要查看 Third Item 才知道项目类型）                 | 较好（直接看到 geometryType）                   |
| **处理复杂度** | 较高（需要解析 Third Item）                                | 较低（直接读取属性）                            |
| **向后兼容**   | IDXv3.0 及更早版本支持                                     | 仅 IDXv4.0+ 支持                                |

---

### 🧩 **"Third Item" 被省略后的功能保留**

原本由 "Third Item" 提供的功能现在分布在：

1. **`geometryType` 属性**：提供主要类型信息（如 `BOARD_OUTLINE`、`COMPONENT`、`HOLE_PLATED`）
2. **`ShapeElementType`**：提供形状元素类型（如 `FeatureShapeElement`、`PartMountingFeature`）
3. **`UserProperty` 自定义属性**：提供额外的特性信息（如 `THICKNESS`、`MATERIAL`）

---

### 🔄 **转换关系示例**

| 传统方式                                                     | 简化方式                                |
| ------------------------------------------------------------ | --------------------------------------- |
| `EDMDStratum` + `StratumType="DesignLayerStratum"`           | `geometryType="BOARD_OUTLINE"`          |
| `EDMDAssemblyComponent` + `AssemblyComponentType="Physical"` | `geometryType="COMPONENT"`              |
| `EDMDKeepOut` + `Purpose="ComponentPlacement"`               | `geometryType="KEEPOUT_AREA_COMPONENT"` |
| `EDMDInterStratumFeature` + `InterStratumFeatureType="PlatedCutout"` | `geometryType="HOLE_PLATED"`            |

---

### 💡 **实际开发建议**

1. **新项目优先使用简化方式**：更简洁、更易维护
2. **如需兼容旧系统**：可以同时支持两种方式
3. **转换工具**：开发从传统到简化的转换器，用于处理历史数据
4. **验证**：确保 `geometryType` 与 `ShapeElementType` 等属性一致

这样设计的主要目的是**减少 XML 嵌套、提高解析效率、降低文件体积**，同时保持向后兼容性。

## 九、构建顺序

根据 **IDXv4.5 协议规范**和最佳实践，构建 IDX 文件有**两种主要方法**。让我详细分析每种方法的优缺点。

### 📊 **两种构建策略对比**

#### **方法1：按层级统一构建（推荐）**
```
先构建所有Points → 所有Geometry → 所有CurveSet2D → 所有ShapeElement → 所有Item
```
这是**文档示例采用的方式**，也是**最推荐的方法**。

**示例结构：**
```xml
<!-- 1. 所有几何点 -->
<foundation:CartesianPoint id="PT1">...</foundation:CartesianPoint>
<foundation:CartesianPoint id="PT2">...</foundation:CartesianPoint>
<foundation:CartesianPoint id="PT3">...</foundation:CartesianPoint>
<foundation:CartesianPoint id="PT4">...</foundation:CartesianPoint>
<foundation:CartesianPoint id="PT5">...</foundation:CartesianPoint>

<!-- 2. 所有几何曲线 -->
<foundation:PolyLine id="POLY_BOARD">...</foundation:PolyLine>
<foundation:PolyLine id="POLY_COMP1">...</foundation:PolyLine>
<foundation:Arc id="ARC_CUTOUT">...</foundation:Arc>

<!-- 3. 所有曲线集 -->
<foundation:CurveSet2d id="CURVESET_BOARD">...</foundation:CurveSet2d>
<foundation:CurveSet2d id="CURVESET_COMP1">...</foundation:CurveSet2d>
<foundation:CurveSet2d id="CURVESET_CUTOUT">...</foundation:CurveSet2d>

<!-- 4. 所有形状元素 -->
<foundation:ShapeElement id="SHAPE_BOARD">...</foundation:ShapeElement>
<foundation:ShapeElement id="SHAPE_COMP1">...</foundation:ShapeElement>
<foundation:ShapeElement id="SHAPE_CUTOUT">...</foundation:ShapeElement>

<!-- 5. 所有项目定义（Item single） -->
<foundation:Item id="ITEM_BOARD_DEF">...</foundation:Item>
<foundation:Item id="ITEM_COMP1_DEF">...</foundation:Item>
<foundation:Item id="ITEM_CUTOUT_DEF">...</foundation:Item>

<!-- 6. 所有项目实例（Item assembly） -->
<foundation:Item id="ITEM_BOARD_ASSY">...</foundation:Item>
<foundation:Item id="ITEM_COMP1_ASSY">...</foundation:Item>
<foundation:Item id="ITEM_CUTOUT_ASSY">...</foundation:Item>
```

#### **方法2：按项目分组构建**

```
每个项目独立构建：项目1的Points→Geometry→CurveSet2D→ShapeElement→Item
然后项目2的同样结构...
```

### ✅ **方法1的优点（按层级构建）**

| 优点                | 说明                                             |
| ------------------- | ------------------------------------------------ |
| **符合XML引用顺序** | 先定义后引用，避免XML解析错误                    |
| **便于重用几何**    | 相同的几何定义（如标准焊盘形状）可被多个项目引用 |
| **文件结构清晰**    | 逻辑分层，便于阅读和调试                         |
| **性能优化**        | 一次生成所有同类元素，减少状态切换               |
| **内存管理**        | 分阶段处理，减少内存占用峰值                     |

### 🎯 **IDX 构建流程示例**

以下是推荐的构建函数设计：

```typescript
/**
 * IDX 构建器类 - 采用分层构建策略
 */
class IDXBuilder {
    // 存储各层元素
    private points: IDXPoint[] = [];
    private geometries: IDXGeometry[] = [];
    private curveSets: IDXCurveSet2D[] = [];
    private shapeElements: IDXShapeElement[] = [];
    private itemsSingle: IDXItem[] = [];
    private itemsAssembly: IDXItem[] = [];
    
    /**
     * 添加一个 PCB 项目到构建器中
     */
    addPCBProject(config: PCBConfig): void {
        // 1. 创建几何点
        const points = this.createPoints(config.geometry);
        this.points.push(...points);
        
        // 2. 创建几何曲线
        const geometry = this.createGeometry(points, config.geometryType);
        this.geometries.push(geometry);
        
        // 3. 创建曲线集
        const curveSet = this.createCurveSet2D(geometry, config.zRange);
        this.curveSets.push(curveSet);
        
        // 4. 创建形状元素
        const shapeElement = this.createShapeElement(curveSet, config.shapeType);
        this.shapeElements.push(shapeElement);
        
        // 5. 创建项目定义（single）
        const itemSingle = this.createItemSingle(shapeElement, config);
        this.itemsSingle.push(itemSingle);
        
        // 6. 创建项目实例（assembly）
        const itemAssembly = this.createItemAssembly(itemSingle, config);
        this.itemsAssembly.push(itemAssembly);
    }
    
    /**
     * 生成完整的 IDX XML
     */
    build(): string {
        // 按层级顺序输出
        return this.generateXML({
            points: this.points,
            geometries: this.geometries,
            curveSets: this.curveSets,
            shapeElements: this.shapeElements,
            itemsSingle: this.itemsSingle,
            itemsAssembly: this.itemsAssembly,
        });
    }
}

/**
 * 分步构建的详细流程
 */
function createIDXDocument(projects: PCBProject[]): string {
    // 阶段1：收集所有几何数据
    const allPoints = projects.flatMap(p => extractPoints(p));
    const allGeometries = projects.map(p => createGeometryFromPoints(p));
    
    // 阶段2：创建 CurveSet2D
    const allCurveSets = projects.map((p, i) => 
        createCurveSet2D(allGeometries[i], p.thickness)
    );
    
    // 阶段3：创建 ShapeElement
    const allShapeElements = projects.map((p, i) => 
        createShapeElement(allCurveSets[i], p.geometryType)
    );
    
    // 阶段4：创建 Items
    const allItemsSingle = projects.map((p, i) => 
        createItemSingle(allShapeElements[i], p.properties)
    );
    
    const allItemsAssembly = projects.map((p, i) => 
        createItemAssembly(allItemsSingle[i], p.instance)
    );
    
    // 阶段5：组装 XML
    return assembleXML({
        points: allPoints,
        geometries: allGeometries,
        curveSets: allCurveSets,
        shapeElements: allShapeElements,
        itemsSingle: allItemsSingle,
        itemsAssembly: allItemsAssembly,
    });
}
```

🔄 **构建顺序的完整示例**

#### **代码生成示例：**
```typescript
// 1. 首先创建所有点
const points = [
    {id: 'PT1', x: 0, y: 0},
    {id: 'PT2', x: 50, y: 0},
    {id: 'PT3', x: 50, y: 30},
    {id: 'PT4', x: 0, y: 30},
];

// 2. 创建几何（多段线）
const polyLine = {
    id: 'POLY_BOARD',
    points: ['PT1', 'PT2', 'PT3', 'PT4', 'PT1']
};

// 3. 创建 CurveSet2D
const curveSet = {
    id: 'CURVESET_BOARD',
    lowerBound: 0,
    upperBound: 1.6,
    geometry: 'POLY_BOARD'
};

// 4. 创建 ShapeElement
const shapeElement = {
    id: 'SHAPE_BOARD',
    elementType: 'FeatureShapeElement',
    definingShape: 'CURVESET_BOARD',
    inverted: false
};

// 5. 创建 Item (single)
const itemSingle = {
    id: 'ITEM_BOARD_DEF',
    name: 'Board Definition',
    itemType: 'single',
    shape: 'SHAPE_BOARD'
};

// 6. 创建 Item (assembly)
const itemAssembly = {
    id: 'ITEM_BOARD_ASSY',
    name: 'My PCB',
    itemType: 'assembly',
    geometryType: 'BOARD_OUTLINE',
    itemInstance: {
        item: 'ITEM_BOARD_DEF',
        instanceName: 'Board1'
    }
};
```

### 📋 **IDX 文件结构的最佳实践**

1. **必须遵循的顺序**：
   - 被引用的元素（如 `CartesianPoint`）必须在引用者（如 `PolyLine`）**之前**定义
   - 否则会导致 XML 解析错误

2. **推荐的层次顺序**（文档示例采用）：
   ```xml
   <!-- 1. 点 -->
   <foundation:CartesianPoint id="..."/>
   
   <!-- 2. 几何 -->
   <foundation:PolyLine id="..."/>
   <foundation:Arc id="..."/>
   
   <!-- 3. 曲线集 -->
   <foundation:CurveSet2d id="..."/>
   
   <!-- 4. 形状元素 -->
   <foundation:ShapeElement id="..."/>
   
   <!-- 5. 项目用途（可选，传统方式） -->
   <foundation:Stratum id="..."/>
   
   <!-- 6. 项目定义 -->
   <foundation:Item id="..." ItemType="single"/>
   
   <!-- 7. 项目实例 -->
   <foundation:Item id="..." ItemType="assembly"/>
   ```

3. **命名约定**：
   - 使用有意义的 ID：`BOARD_OUTLINE`, `COMP_0805_PAD`, `HOLE_3MM`
   - 保持 ID 唯一性
   - 考虑使用前缀：`PT_`, `PL_`, `CS_`, `SH_`, `IT_`

4. **性能考虑**：
   - 对于大型设计（数千个元件），按层级构建可以减少内存碎片
   - 批量处理同类元素可以提高序列化性能

### 🎯 **结论：推荐按层级构建**

**使用"按层级统一构建"（方法1）** 是**最佳选择**，因为：

1. **符合文档示例**：所有 IDX 示例都采用此方式
2. **避免引用错误**：确保先定义后引用
3. **便于代码维护**：清晰的逻辑分层
4. **支持几何重用**：相同几何定义只存储一次
5. **便于验证**：可分层验证数据完整性

您的构建器应该采用这种分层方法，这会生成最规范、最易于其他系统解析的 IDX 文件。

## 十、分层构建详解案例参考

### 📊 IDX 分层构建详解

根据 IDXv4.5 协议规范，以下是各层可能的数据元素枚举及示例：

#### **第1层：点 (Points)**

**可能元素：**
- `CartesianPoint`：二维笛卡尔坐标点（必须）
- 可选：`Point`的其他类型（如极坐标点，但IDX主要用CartesianPoint）

**示例：**
```xml
<!-- 矩形板的四个角点 -->
<foundation:CartesianPoint id="PT1" xsi:type="d2:EDMDCartesianPoint">
  <d2:X><property:Value>0</property:Value></d2:X>
  <d2:Y><property:Value>0</property:Value></d2:Y>
</foundation:CartesianPoint>

<foundation:CartesianPoint id="PT2" xsi:type="d2:EDMDCartesianPoint">
  <d2:X><property:Value>50</property:Value></d2:X>
  <d2:Y><property:Value>0</property:Value></d2:Y>
</foundation:CartesianPoint>

<foundation:CartesianPoint id="PT3" xsi:type="d2:EDMDCartesianPoint">
  <d2:X><property:Value>50</property:Value></d2:X>
  <d2:Y><property:Value>30</property:Value></d2:Y>
</foundation:CartesianPoint>

<foundation:CartesianPoint id="PT4" xsi:type="d2:EDMDCartesianPoint">
  <d2:X><property:Value>0</property:Value></d2:X>
  <d2:Y><property:Value>30</property:Value></d2:Y>
</foundation:CartesianPoint>
```

#### **第2层：几何 (Geometry)**

**可能元素：**
- `PolyLine`：多段线（最常用）
- `Arc`：圆弧
- `Circle3Point`：三点定义的圆
- `CircleCenter`：圆心和直径定义的圆
- `Ellipse`：椭圆
- `Parabola`：抛物线
- `BSplineCurve`：B样条曲线
- `CompositeCurve`：复合曲线（组合多种曲线）
- `Line`：无限直线
- `OffsetCurve`：偏移曲线
- `TrimmedCurve`：修剪曲线

**示例：**
```xml
<!-- 多段线（矩形轮廓） -->
<foundation:PolyLine id="POLY_RECT" xsi:type="d2:EDMDPolyLine">
  <d2:Point>PT1</d2:Point>
  <d2:Point>PT2</d2:Point>
  <d2:Point>PT3</d2:Point>
  <d2:Point>PT4</d2:Point>
  <d2:Point>PT1</d2:Point>
</foundation:PolyLine>

<!-- 圆弧 -->
<foundation:Arc id="ARC_CORNER" xsi:type="d2:EDMDArc">
  <d2:StartPoint>PT_A</d2:StartPoint>
  <d2:MidPoint>PT_B</d2:MidPoint>
  <d2:EndPoint>PT_C</d2:EndPoint>
</foundation:Arc>

<!-- 圆（圆心式） -->
<foundation:CircleCenter id="CIRCLE_HOLE" xsi:type="d2:EDMDCircleCenter">
  <d2:CenterPoint>PT_CENTER</d2:CenterPoint>
  <d2:Diameter><property:Value>3.2</property:Value></d2:Diameter>
</foundation:CircleCenter>

<!-- B样条曲线 -->
<foundation:BSplineCurve id="BSPLINE_CURVE" xsi:type="d2:EDMDBSplineCurve">
  <d2:ControlPoint>PT_CTRL1</d2:ControlPoint>
  <d2:ControlPoint>PT_CTRL2</d2:ControlPoint>
  <d2:ControlPoint>PT_CTRL3</d2:ControlPoint>
  <d2:Degree>2</d2:Degree>
</foundation:BSplineCurve>

<!-- 复合曲线（组合多种） -->
<foundation:CompositeCurve id="COMPOSITE_OUTLINE" xsi:type="d2:EDMDCompositeCurve">
  <d2:Curve>POLY_SEG1</d2:Curve>
  <d2:Curve>ARC_SEG1</d2:Curve>
  <d2:Curve>POLY_SEG2</d2:Curve>
</foundation:CompositeCurve>
```

#### **第3层：曲线集 (CurveSet2D)**

**可能属性/子元素：**

- `ShapeDescriptionType`：形状描述类型（通常为"GeometricModel"）
- `LowerBound`：Z轴下边界
- `UpperBound`：Z轴上边界
- `DetailedGeometricModelElement`：引用的几何元素（一个或多个）
- `Thickness`：可选，用于多段线的厚度定义

**示例：**
```xml
<!-- 板的曲线集（厚度1.6mm） -->
<foundation:CurveSet2d id="CURVESET_BOARD" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound><property:Value>0</property:Value></d2:LowerBound>
  <d2:UpperBound><property:Value>1.6</property:Value></d2:UpperBound>
  <d2:DetailedGeometricModelElement>POLY_RECT</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<!-- 孔的曲线集（贯穿孔，上下边界相同） -->
<foundation:CurveSet2d id="CURVESET_HOLE" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound><property:Value>0</property:Value></d2:LowerBound>
  <d2:UpperBound><property:Value>0</property:Value></d2:UpperBound>
  <d2:DetailedGeometricModelElement>CIRCLE_HOLE</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>

<!-- 带厚度的多段线（用于走线或铣削路径） -->
<foundation:CurveSet2d id="CURVESET_TRACE" xsi:type="d2:EDMDCurveSet2d">
  <pdm:ShapeDescriptionType>GeometricModel</pdm:ShapeDescriptionType>
  <d2:LowerBound><property:Value>0.035</property:Value></d2:LowerBound>
  <d2:UpperBound><property:Value>0.035</property:Value></d2:UpperBound>
  <d2:DetailedGeometricModelElement>POLY_TRACE</d2:DetailedGeometricModelElement>
</foundation:CurveSet2d>
```

#### **第4层：形状元素 (ShapeElement)**

**可能属性：**
- `ShapeElementType`：形状元素类型
  - `FeatureShapeElement`：特征形状元素（最常用）
  - `PartMountingFeature`：零件安装特征（用于孔等）
  - `NonFeatureShapeElement`：非特征形状元素
  - `PartFeature`：零件特征
  - `ComponentTermination`：元件端子
- `Inverted`：布尔运算标志（false=添加，true=减去）
- `DefiningShape`：引用的曲线集

**示例：**
```xml
<!-- 板的形状元素（添加材料） -->
<foundation:ShapeElement id="SHAPE_BOARD" xsi:type="pdm:EDMDShapeElement">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:Inverted>false</pdm:Inverted>
  <pdm:DefiningShape>CURVESET_BOARD</pdm:DefiningShape>
</foundation:ShapeElement>

<!-- 孔的形状元素（减去材料） -->
<foundation:ShapeElement id="SHAPE_HOLE" xsi:type="pdm:EDMDShapeElement">
  <pdm:ShapeElementType>PartMountingFeature</pdm:ShapeElementType>
  <pdm:Inverted>true</pdm:Inverted>
  <pdm:DefiningShape>CURVESET_HOLE</pdm:DefiningShape>
</foundation:ShapeElement>

<!-- 走线的形状元素 -->
<foundation:ShapeElement id="SHAPE_TRACE" xsi:type="pdm:EDMDShapeElement">
  <pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>
  <pdm:Inverted>false</pdm:Inverted>
  <pdm:DefiningShape>CURVESET_TRACE</pdm:DefiningShape>
</foundation:ShapeElement>
```

#### **第5层：项目用途 (可选，传统方式)**

**可能元素：**
- `Stratum`：层（用于板轮廓）
- `AssemblyComponent`：装配组件（用于元件）
- `KeepOut`：禁布区
- `KeepIn`：保持区
- `InterStratumFeature`：层间特征（用于孔、过孔等）
- `FunctionalItemShape`：功能形状（用于柔性板弯曲等）
- 在简化方式中，这些被`geometryType`属性替代

**示例：**
```xml
<!-- 传统方式：板的层定义 -->
<foundation:Stratum id="STRATUM_BOARD" xsi:type="pdm:EDMDStratum">
  <pdm:ShapeElement>SHAPE_BOARD</pdm:ShapeElement>
  <pdm:StratumType>DesignLayerStratum</pdm:StratumType>
  <pdm:StratumSurfaceDesignation>PrimarySurface</pdm:StratumSurfaceDesignation>
</foundation:Stratum>

<!-- 传统方式：禁布区 -->
<foundation:KeepOut id="KEEPOUT_AREA" xsi:type="pdm:EDMDKeepOut">
  <pdm:ShapeElement>SHAPE_KEEPOUT</pdm:ShapeElement>
  <pdm:Purpose>ComponentPlacement</pdm:Purpose>
</foundation:KeepOut>
```

#### **第6层：项目定义 (Item single)**

**可能属性：**
- `ItemType`：必须为"single"
- `Name`：项目名称
- `Description`：项目描述
- `Shape`：引用形状元素或传统方式的项目用途元素
- `Identifier`：唯一标识符
- `PackageName`：包名称（用于可重用封装）

**示例：**
```xml
<!-- 简化方式：板定义 -->
<foundation:Item id="ITEM_BOARD_DEF">
  <foundation:Name>Board Definition</foundation:Name>
  <foundation:Description>Simple rectangular board</foundation:Description>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Identifier xsi:type="foundation:EDMDIdentifier">
    <foundation:SystemScope>IDX-IO</foundation:SystemScope>
    <foundation:Number>BOARD001</foundation:Number>
    <foundation:Version>1</foundation:Version>
  </pdm:Identifier>
  <pdm:Shape>SHAPE_BOARD</pdm:Shape>
</foundation:Item>

<!-- 简化方式：孔定义 -->
<foundation:Item id="ITEM_HOLE_DEF">
  <foundation:Name>3.2mm Hole</foundation:Name>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:PackageName>
    <foundation:SystemScope>LIBRARY</foundation:SystemScope>
    <foundation:ObjectName>HOLE_3.2MM_NP</foundation:ObjectName>
  </pdm:PackageName>
  <pdm:Shape>SHAPE_HOLE</pdm:Shape>
</foundation:Item>

<!-- 传统方式：板定义（引用Stratum） -->
<foundation:Item id="ITEM_BOARD_DEF_TRAD">
  <foundation:Name>Board Definition</foundation:Name>
  <pdm:ItemType>single</pdm:ItemType>
  <pdm:Shape>STRATUM_BOARD</pdm:Shape>
</foundation:Item>
```

#### **第7层：项目实例 (Item assembly)**

**可能属性：**
- `ItemType`：必须为"assembly"
- `geometryType`：几何类型（简化方式的关键属性）
- `Name`：项目名称
- `ItemInstance`：一个或多个实例
  - `Item`：引用的项目定义
  - `InstanceName`：实例名称
  - `Transformation`：变换矩阵
  - `zOffset`：Z轴偏移（可选）
- `AssembleToName`：装配参考名称（可选）
- `ReferenceName`：参考名称（可选）

**示例：**
```xml
<!-- 简化方式：板实例 -->
<foundation:Item id="ITEM_BOARD_ASSY" geometryType="BOARD_OUTLINE">
  <foundation:Name>Main PCB Board</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance id="INST_BOARD">
    <pdm:Item>ITEM_BOARD_DEF</pdm:Item>
    <pdm:InstanceName>Board1</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1</pdm:xx><pdm:xy>0</pdm:xy>
      <pdm:yx>0</pdm:yx><pdm:yy>1</pdm:yy>
      <pdm:tx><property:Value>0</property:Value></pdm:tx>
      <pdm:ty><property:Value>0</property:Value></pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
</foundation:Item>

<!-- 简化方式：孔实例 -->
<foundation:Item id="ITEM_HOLE_ASSY" geometryType="HOLE_NON_PLATED">
  <foundation:Name>Mounting Holes</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <pdm:ItemInstance id="INST_HOLE1">
    <pdm:Item>ITEM_HOLE_DEF</pdm:Item>
    <pdm:InstanceName>Hole1</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1</pdm:xx><pdm:xy>0</pdm:xy>
      <pdm:yx>0</pdm:yx><pdm:yy>1</pdm:yy>
      <pdm:tx><property:Value>10</property:Value></pdm:tx>
      <pdm:ty><property:Value>10</property:Value></pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
  <pdm:ItemInstance id="INST_HOLE2">
    <pdm:Item>ITEM_HOLE_DEF</pdm:Item>
    <pdm:InstanceName>Hole2</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>1</pdm:xx><pdm:xy>0</pdm:xy>
      <pdm:yx>0</pdm:yx><pdm:yy>1</pdm:yy>
      <pdm:tx><property:Value>40</property:Value></pdm:tx>
      <pdm:ty><property:Value>10</property:Value></pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
</foundation:Item>

<!-- 简化方式：元件实例 -->
<foundation:Item id="ITEM_COMP_ASSY" geometryType="COMPONENT">
  <foundation:Name>Resistor R1</foundation:Name>
  <pdm:ItemType>assembly</pdm:ItemType>
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECAD</foundation:SystemScope>
      <foundation:ObjectName>REFDES</foundation:ObjectName>
    </property:Key>
    <property:Value>R1</property:Value>
  </foundation:UserProperty>
  <pdm:ItemInstance id="INST_COMP">
    <pdm:Item>ITEM_COMP_DEF</pdm:Item>
    <pdm:InstanceName>R1_Instance</pdm:InstanceName>
    <pdm:Transformation>
      <pdm:TransformationType>d2</pdm:TransformationType>
      <pdm:xx>0.707</pdm:xx><pdm:xy>0.707</pdm:xy>
      <pdm:yx>-0.707</pdm:yx><pdm:yy>0.707</pdm:yy>
      <pdm:tx><property:Value>25</property:Value></pdm:tx>
      <pdm:ty><property:Value>15</property:Value></pdm:ty>
    </pdm:Transformation>
  </pdm:ItemInstance>
  <pdm:AssembleToName>TOP_SURFACE</pdm:AssembleToName>
</foundation:Item>
```

### 🎯 **构建顺序建议**

在实际代码中，推荐这样的构建流程：

```typescript
// 1. 创建所有点
const points = createPoints([
    {id: 'PT1', x: 0, y: 0},
    {id: 'PT2', x: 50, y: 0},
    {id: 'PT3', x: 50, y: 30},
    {id: 'PT4', x: 0, y: 30},
    {id: 'PT_CENTER1', x: 10, y: 10},
    {id: 'PT_CENTER2', x: 40, y: 10}
]);

// 2. 创建所有几何元素
const geometries = createGeometries([
    {type: 'PolyLine', id: 'POLY_BOARD', points: ['PT1','PT2','PT3','PT4','PT1']},
    {type: 'CircleCenter', id: 'CIRCLE_HOLE1', center: 'PT_CENTER1', diameter: 3.2},
    {type: 'CircleCenter', id: 'CIRCLE_HOLE2', center: 'PT_CENTER2', diameter: 3.2}
]);

// 3. 创建所有曲线集
const curveSets = createCurveSets([
    {id: 'CURVESET_BOARD', geometry: 'POLY_BOARD', lower: 0, upper: 1.6},
    {id: 'CURVESET_HOLE1', geometry: 'CIRCLE_HOLE1', lower: 0, upper: 0},
    {id: 'CURVESET_HOLE2', geometry: 'CIRCLE_HOLE2', lower: 0, upper: 0}
]);

// 4. 创建所有形状元素
const shapeElements = createShapeElements([
    {id: 'SHAPE_BOARD', curveSet: 'CURVESET_BOARD', inverted: false},
    {id: 'SHAPE_HOLE1', curveSet: 'CURVESET_HOLE1', inverted: true},
    {id: 'SHAPE_HOLE2', curveSet: 'CURVESET_HOLE2', inverted: true}
]);

// 5. 创建所有项目定义（single）
const itemSingles = createItemSingles([
    {id: 'ITEM_BOARD_DEF', shape: 'SHAPE_BOARD', name: 'Board Definition'},
    {id: 'ITEM_HOLE_DEF', shape: 'SHAPE_HOLE1', name: 'Hole Definition'}
]);

// 6. 创建所有项目实例（assembly）
const itemAssemblies = createItemAssemblies([
    {
        id: 'ITEM_BOARD_ASSY', 
        geometryType: 'BOARD_OUTLINE',
        name: 'Main Board',
        instances: [{item: 'ITEM_BOARD_DEF', name: 'Board1'}]
    },
    {
        id: 'ITEM_HOLES_ASSY',
        geometryType: 'HOLE_NON_PLATED',
        name: 'Mounting Holes',
        instances: [
            {item: 'ITEM_HOLE_DEF', name: 'Hole1', x: 10, y: 10},
            {item: 'ITEM_HOLE_DEF', name: 'Hole2', x: 40, y: 10}
        ]
    }
]);
```

这样分层构建既符合XML的先定义后引用原则，又便于代码组织和维护。

## 十一、IDXv4.5 实体几何详细说明

根据IDXv4.5协议文档，以下是各实体几何的详细说明：

### 📐 **1. 板子（Board）几何**

#### **允许的几何类型：**
```typescript
// 板子几何可以是：
export type ECADBoardGeometry = 
    | ECADPolyline          // 最常用，90%场景
    | ECADCompositeGeometry // 复杂板形
    | ECADCurveSet          // 多段曲线组合
```

#### **具体限制：**
- **必须闭合**：形成封闭区域
- **不能自相交**：多边形边不能相交
- **方向**：通常外轮廓逆时针，内孔顺时针
- **最少点数**：至少3个点（三角形）

#### **示例场景：**
```xml
<!-- 简单矩形板 -->
<foundation:PolyLine id="BOARD_OUTLINE">
  <d2:Point>PT1</d2:Point> <!-- 0,0 -->
  <d2:Point>PT2</d2:Point> <!-- 100,0 -->
  <d2:Point>PT3</d2:Point> <!-- 100,60 -->
  <d2:Point>PT4</d2:Point> <!-- 0,60 -->
  <d2:Point>PT1</d2:Point> <!-- 闭合 -->
</foundation:PolyLine>

<!-- 带圆弧的板 -->
<foundation:CompositeCurve id="BOARD_COMPLEX">
  <d2:Curve>POLY_SEG1</d2:Curve> <!-- 直线段 -->
  <d2:Curve>ARC_CORNER</d2:Curve> <!-- 圆弧角 -->
  <d2:Curve>POLY_SEG2</d2:Curve> <!-- 直线段 -->
  <d2:Curve>ARC_CORNER2</d2:Curve> <!-- 圆弧角 -->
</foundation:CompositeCurve>

<!-- 柔性板（多个区域） -->
<foundation:CurveSet2d id="FLEX_BOARD_AREA1">
  <!-- 柔性区域1 -->
</foundation:CurveSet2d>
<foundation:CurveSet2d id="FLEX_BOARD_AREA2">
  <!-- 柔性区域2 -->
</foundation:CurveSet2d>
```

#### **特殊板形支持：**
- **刚柔结合板**：多个LayerZone，每个有独立几何
- **阶梯板**：不同区域不同厚度
- **异形板**：任意复杂轮廓
- **挖洞板**：通过多个ShapeElement实现

### 🔵 **2. 孔（Hole）几何**

#### **允许的几何类型：**
```typescript
export type ECADHoleGeometry =
    | ECADCircle          // 标准圆形孔（90%）
    | ECADPolyline        // 异形孔（槽孔、方孔）
    | ECADCompositeCurve  // 复合孔形
    | ECADMillingPath     // 铣削路径孔
```

#### **孔类型与几何对应：**

| 孔类型               | 典型几何           | 是否闭合 | 特殊属性     |
| -------------------- | ------------------ | -------- | ------------ |
| **PTH（电镀通孔）**  | Circle             | 必须闭合 | 直径、电镀   |
| **NPTH（非电镀孔）** | Circle             | 必须闭合 | 直径、无电镀 |
| **盲孔/埋孔**        | Circle             | 必须闭合 | 起始/结束层  |
| **过孔（VIA）**      | Circle             | 必须闭合 | 直径、连接层 |
| **槽孔（Slot）**     | Polyline           | 必须闭合 | 长度、宽度   |
| **铣削孔**           | Polyline           | 可以开放 | 刀具直径     |
| **异形孔**           | Polyline/Composite | 必须闭合 | 复杂轮廓     |

#### **示例场景：**
```xml
<!-- 标准圆形孔 -->
<foundation:CircleCenter id="HOLE_3MM">
  <d2:CenterPoint>PT_CENTER</d2:CenterPoint>
  <d2:Diameter><property:Value>3.0</property:Value></d2:Diameter>
</foundation:CircleCenter>

<!-- 槽孔（矩形） -->
<foundation:PolyLine id="SLOT_HOLE">
  <d2:Point>PT1</d2:Point> <!-- 0,0 -->
  <d2:Point>PT2</d2:Point> <!-- 10,0 -->
  <d2:Point>PT3</d2:Point> <!-- 10,3 -->
  <d2:Point>PT4</d2:Point> <!-- 0,3 -->
  <d2:Point>PT1</d2:Point> <!-- 闭合 -->
</foundation:PolyLine>

<!-- 铣削路径孔 -->
<foundation:PolyLine id="MILLED_PATH">
  <d2:Thickness><property:Value>2.0</property:Value></d2:Thickness>
  <d2:Point>PT_START</d2:Point>
  <d2:Point>PT_MID</d2:Point>
  <d2:Point>PT_END</d2:Point>
  <!-- 开放路径，表示铣刀中心线 -->
</foundation:PolyLine>

<!-- 复合孔形 -->
<foundation:CompositeCurve id="COMPLEX_HOLE">
  <d2:Curve>ARC_SEG1</d2:Curve> <!-- 圆弧段 -->
  <d2:Curve>LINE_SEG1</d2:Curve> <!-- 直线段 -->
  <d2:Curve>ARC_SEG2</d2:Curve> <!-- 圆弧段 -->
  <d2:Curve>LINE_SEG2</d2:Curve> <!-- 直线段 -->
</foundation:CompositeCurve>
```

#### **几何限制：**
- **闭合性**：除铣削路径外都必须闭合
- **尺寸**：直径/宽度必须大于0
- **位置**：必须在板子轮廓内（除非是板边孔）
- **重叠**：孔之间可以重叠形成大孔

### 🧩 **3. 封装（Footprint）几何**

#### **封装几何组成：**
一个封装由**多个几何元素**组成，包括：

```typescript
export interface ECADFootprintGeometry {
    /** 外形轮廓（必须） */
    outline: ECADPolyline;
    
    /** 焊盘几何（必须，至少一个） */
    pads: ECADPadGeometry[];
    
    /** 丝印几何（可选） */
    silkscreen?: ECADSilkscreenGeometry[];
    
    /** 装配几何（可选） */
    assembly?: ECADAssemblyGeometry[];
    
    /** 禁布区（可选） */
    courtyard?: ECADPolyline;
    
    /** 3D模型引用（可选） */
    model3d?: ECADModel3D;
}
```

#### **各部分几何限制：**

**a) 外形轮廓（Outline）**

- **类型**：Polyline（90%）、CompositeCurve
- **必须闭合**：形成封闭区域
- **不能自相交**
- **最少点数**：至少3点
- **示例**：
  ```xml
  <!-- 0402封装外形 -->
  <foundation:PolyLine id="OUTLINE_0402">
    <d2:Point>PT1</d2:Point> <!-- -1.0, -0.5 -->
    <d2:Point>PT2</d2:Point> <!-- 1.0, -0.5 -->
    <d2:Point>PT3</d2:Point> <!-- 1.0, 0.5 -->
    <d2:Point>PT4</d2:Point> <!-- -1.0, 0.5 -->
    <d2:Point>PT1</d2:Point> <!-- 闭合 -->
  </foundation:PolyLine>
  ```

##### **b) 焊盘（Pads）**
- **类型**：
  ```typescript
  export type ECADPadGeometry =
    | ECADCircle      // 圆形焊盘（过孔、测试点）
    | ECADPolyline    // 矩形/异形焊盘（SMT焊盘）
    | ECADRoundedRect // 圆角矩形（特殊处理为Polyline）
  ```
- **必须闭合**：形成封闭区域
- **位置**：相对于封装原点
- **层关联**：顶层/底层/内层
- **示例**：
  ```xml
  <!-- 圆形焊盘（过孔） -->
  <foundation:CircleCenter id="PAD_VIA">
    <d2:CenterPoint>PT_CENTER</d2:CenterPoint>
    <d2:Diameter><property:Value>0.6</property:Value></d2:Diameter>
  </foundation:CircleCenter>
  
  <!-- 矩形焊盘（SMT） -->
  <foundation:PolyLine id="PAD_SMT">
    <d2:Point>PT1</d2:Point> <!-- -0.75, -0.25 -->
    <d2:Point>PT2</d2:Point> <!-- 0.75, -0.25 -->
    <d2:Point>PT3</d2:Point> <!-- 0.75, 0.25 -->
    <d2:Point>PT4</d2:Point> <!-- -0.75, 0.25 -->
    <d2:Point>PT1</d2:Point> <!-- 闭合 -->
  </foundation:PolyLine>
  ```

##### **c) 丝印（Silkscreen）**
- **类型**：
  ```typescript
  export type ECADSilkscreenGeometry =
    | ECADLine        // 线段（元件框）
    | ECADArc         // 圆弧（标识）
    | ECADPolyline    // 多边形（标识）
    | ECADText        // 文字（元件值、标识）
    | ECADCircle      // 圆（极性标识）
  ```
- **可以开放或闭合**：线段可以是开放的
- **厚度属性**：定义线宽
- **示例**：
  ```xml
  <!-- 元件外框（线段） -->
  <foundation:PolyLine id="SILK_OUTLINE">
    <d2:Thickness><property:Value>0.15</property:Value></d2:Thickness>
    <d2:Point>PT1</d2:Point>
    <d2:Point>PT2</d2:Point>
    <d2:Point>PT3</d2:Point>
    <d2:Point>PT4</d2:Point>
    <!-- 可能不闭合（表示U形框） -->
  </foundation:PolyLine>
  
  <!-- 极性标识（圆） -->
  <foundation:CircleCenter id="SILK_POLARITY">
    <d2:CenterPoint>PT_CENTER</d2:CenterPoint>
    <d2:Diameter><property:Value>1.0</property:Value></d2:Diameter>
  </foundation:CircleCenter>
  ```

##### **d) 禁布区（Courtyard）**
- **类型**：闭合区域
- **必须闭合**：定义元件占用区域
- **通常在元件轮廓外扩一定距离**
- **示例**：
  
  ```xml
  <!-- 0402封装的禁布区 -->
  <foundation:PolyLine id="COURTYARD_0402">
    <d2:Point>PT1</d2:Point> <!-- -1.2, -0.7 (外扩0.2mm) -->
    <d2:Point>PT2</d2:Point> <!-- 1.2, -0.7 -->
    <d2:Point>PT3</d2:Point> <!-- 1.2, 0.7 -->
    <d2:Point>PT4</d2:Point> <!-- -1.2, 0.7 -->
    <d2:Point>PT1</d2:Point> <!-- 闭合 -->
  </foundation:PolyLine>
  ```

### ⚠️ **4. 禁止区域（Keepout/Keepin）几何**

#### **约束类型与几何对应：**

| 约束类型       | 目的               | 典型几何         | 闭合要求     | 特殊属性   |
| -------------- | ------------------ | ---------------- | ------------ | ---------- |
| **区域禁布**   | ComponentPlacement | Polyline, Circle | **必须闭合** | 高度范围   |
| **路径禁布**   | Route              | Line, Polyline   | **可以开放** | 宽度、网络 |
| **过孔禁布**   | Via                | Circle, Polyline | **必须闭合** | 层关联     |
| **测试点禁布** | TestPoint          | Circle           | **必须闭合** | 直径       |
| **热禁布**     | Thermal            | Polyline         | **必须闭合** | 热参数     |
| **通用禁布**   | Generic            | 任意几何         | 根据用途     | 自定义     |

#### **详细说明：**

##### **a) 区域禁布（Component/Route/Via等）**

- **几何类型**：Polyline（多边形）、Circle（圆形）、Composite
- **必须闭合**：定义不可进入的区域
- **可以有内洞**：通过多个ShapeElement实现
- **Z轴范围**：可定义作用高度
- **示例**：
  ```xml
  <!-- 矩形禁布区 -->
  <foundation:PolyLine id="KEEPOUT_RECT">
    <d2:Point>PT1</d2:Point> <!-- 定义区域边界 -->
    <d2:Point>PT2</d2:Point>
    <d2:Point>PT3</d2:Point>
    <d2:Point>PT4</d2:Point>
    <d2:Point>PT1</d2:Point> <!-- 闭合 -->
  </foundation:PolyLine>
  
  <!-- 圆形禁布区 -->
  <foundation:CircleCenter id="KEEPOUT_CIRCLE">
    <d2:CenterPoint>PT_CENTER</d2:CenterPoint>
    <d2:Diameter><property:Value>20.0</property:Value></d2:Diameter>
  </foundation:CircleCenter>
  ```

##### **b) 路径禁布（布线限制）**
- **几何类型**：Line（直线）、Polyline（折线）、Arc（圆弧）
- **可以开放**：定义不可布线的路径
- **厚度属性**：定义禁布宽度
- **示例**：
  ```xml
  <!-- 直线禁布（高速信号隔离） -->
  <foundation:Line id="KEEPOUT_LINE">
    <d2:Point>PT_START</d2:Point>
    <d2:Vector>PT_END</d2:Vector>
  </foundation:Line>
  
  <!-- 带宽度的路径禁布 -->
  <foundation:PolyLine id="KEEPOUT_PATH">
    <d2:Thickness><property:Value>2.0</property:Value></d2:Thickness>
    <d2:Point>PT1</d2:Point>
    <d2:Point>PT2</d2:Point>
    <d2:Point>PT3</d2:Point>
    <!-- 开放路径 -->
  </foundation:PolyLine>
  ```

##### **c) 特殊禁布类型**
```xml
<!-- 热禁布区（散热限制） -->
<foundation:PolyLine id="THERMAL_KEEPOUT">
  <!-- 定义散热器安装区域 -->
</foundation:PolyLine>

<!-- 测试点禁布（测试探针区域） -->
<foundation:CircleCenter id="TESTPOINT_KEEPOUT">
  <d2:CenterPoint>PT_TEST</d2:CenterPoint>
  <d2:Diameter><property:Value>2.54</property:Value></d2:Diameter>
</foundation:CircleCenter>

<!-- 复合禁布（复杂形状） -->
<foundation:CompositeCurve id="COMPLEX_KEEPOUT">
  <d2:Curve>POLY_MAIN</d2:Curve>
  <d2:Curve>ARC_CORNER</d2:Curve>
  <d2:Curve>POLY_EXTENSION</d2:Curve>
</foundation:CompositeCurve>
```

**几何有效性规则总结：**

| 规则           | 板子 | 孔   | 封装轮廓 | 焊盘 | 丝印 | 区域禁布 | 路径禁布 |
| -------------- | ---- | ---- | -------- | ---- | ---- | -------- | -------- |
| **必须闭合**   | ✅    | ✅    | ✅        | ✅    | ❌    | ✅        | ❌        |
| **不能自相交** | ✅    | ✅    | ✅        | ✅    | ✅    | ✅        | ✅        |
| **最小点数**   | 3    | 3    | 3        | 3    | 2    | 3        | 2        |
| **厚度属性**   | ❌    | ❌    | ❌        | ❌    | ✅    | ❌        | ✅        |
| **内洞支持**   | ✅    | ❌    | ❌        | ❌    | ❌    | ✅        | ❌        |
| **Z轴范围**    | ✅    | ✅    | ✅        | ✅    | ❌    | ✅        | ✅        |

### 🎯 **关键要点：**

1. **板子**：最灵活，支持复杂轮廓和挖洞
2. **孔**：以圆形为主，但支持任意闭合形状
3. **封装**：多部分组合，各子部分有不同规则
4. **禁布区**：根据用途决定几何特性，最灵活的是路径禁布

所有几何最终都通过IDX的**分层结构**（点→几何→曲线集→形状元素）来表示，并通过**Inverted属性**和**CSG布尔运算**实现复杂形状的构造。

## 十二、IDX层和层堆叠定义与示例

根据IDXv4.5协议文档，以下是层和层堆叠的详细定义和示例：

### 🏗️ **层和层堆叠的IDX结构**

#### **1. 简单案例：四层板堆叠**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<foundation:EDMDDataSet 
    xmlns:foundation="http://prostep.org/EDMD/5.0/foundation" 
    xmlns:pdm="http://prostep.org/EDMD/5.0/pdm" 
    xmlns:property="http://prostep.org/EDMD/5.0/property" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    
    <foundation:Header>
        <!-- 头部信息省略 -->
    </foundation:Header>
    
    <foundation:Body>
        
        <!-- ============ 第1步：定义物理层 ============ -->
        
        <!-- 顶层阻焊层 -->
        <foundation:Item id="ITEM_TOP_SOLDERMASK" geometryType="LAYER_SOLDERMASK">
            <foundation:Name>Top Solder Mask</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>TOP_SOLDERMASK</pdm:ReferenceName>
            <!-- 用户属性：颜色（自定义扩展） -->
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Color</foundation:ObjectName>
                </property:Key>
                <property:Value>#4CAF50</property:Value> <!-- 绿色 -->
            </foundation:UserProperty>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Thickness</foundation:ObjectName>
                </property:Key>
                <property:Value>0.025</property:Value> <!-- 0.025mm -->
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- 顶层信号层 -->
        <foundation:Item id="ITEM_TOP_SIGNAL" geometryType="LAYER_OTHERSIGNAL">
            <foundation:Name>Top Signal Layer</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>TOP_SIGNAL</pdm:ReferenceName>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Color</foundation:ObjectName>
                </property:Key>
                <property:Value>#FF5722</property:Value> <!-- 橙色 -->
            </foundation:UserProperty>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>CopperWeight</foundation:ObjectName>
                </property:Key>
                <property:Value>1</property:Value> <!-- 1oz -->
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- 内层1（电源层） -->
        <foundation:Item id="ITEM_POWER" geometryType="LAYER_POWERGROUND">
            <foundation:Name>Power Plane</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>POWER_PLANE</pdm:ReferenceName>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Color</foundation:ObjectName>
                </property:Key>
                <property:Value>#2196F3</property:Value> <!-- 蓝色 -->
            </foundation:UserProperty>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>NetName</foundation:ObjectName>
                </property:Key>
                <property:Value>VCC_3V3</property:Value>
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- 内层2（地层） -->
        <foundation:Item id="ITEM_GROUND" geometryType="LAYER_POWERGROUND">
            <foundation:Name>Ground Plane</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>GROUND_PLANE</pdm:ReferenceName>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Color</foundation:ObjectName>
                </property:Key>
                <property:Value>#795548</property:Value> <!-- 棕色 -->
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- 底层信号层 -->
        <foundation:Item id="ITEM_BOTTOM_SIGNAL" geometryType="LAYER_OTHERSIGNAL">
            <foundation:Name>Bottom Signal Layer</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>BOTTOM_SIGNAL</pdm:ReferenceName>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Color</foundation:ObjectName>
                </property:Key>
                <property:Value>#FF9800</property:Value> <!-- 橙色 -->
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- 底层阻焊层 -->
        <foundation:Item id="ITEM_BOTTOM_SOLDERMASK" geometryType="LAYER_SOLDERMASK">
            <foundation:Name>Bottom Solder Mask</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>BOTTOM_SOLDERMASK</pdm:ReferenceName>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Color</foundation:ObjectName>
                </property:Key>
                <property:Value>#4CAF50</property:Value>
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- 顶层丝印层 -->
        <foundation:Item id="ITEM_TOP_SILKSCREEN" geometryType="LAYER_SILKSCREEN">
            <foundation:Name>Top Silkscreen</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>TOP_SILKSCREEN</pdm:ReferenceName>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Color</foundation:ObjectName>
                </property:Key>
                <property:Value>#FFFFFF</property:Value> <!-- 白色 -->
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- 介质层（核心材料） -->
        <foundation:Item id="ITEM_DIELECTRIC1" geometryType="LAYER_DIELECTRIC">
            <foundation:Name>Core Material FR4</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ReferenceName>CORE_1</pdm:ReferenceName>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Material</foundation:ObjectName>
                </property:Key>
                <property:Value>FR4</property:Value>
            </foundation:UserProperty>
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>DielectricConstant</foundation:ObjectName>
                </property:Key>
                <property:Value>4.5</property:Value>
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- ============ 第2步：定义层堆叠 ============ -->
        
        <foundation:Item id="ITEM_STACKUP_MAIN" geometryType="LAYER_STACKUP">
            <foundation:Name>Main 4-Layer Stackup</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            
            <!-- 第1层：顶层阻焊 -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>TopSolderMask_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <!-- 定义此层在堆叠中的位置（Z范围） -->
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.600</property:Value> <!-- 相对于板底 -->
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.625</property:Value> <!-- 厚度0.025mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_TOP_SOLDERMASK</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第2层：顶层信号层 -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>TopSignal_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.575</property:Value>
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.600</property:Value> <!-- 铜厚0.035mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_TOP_SIGNAL</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第3层：介质层1（顶层铜箔下面的预浸料） -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Prepreg1_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.200</property:Value>
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.575</property:Value> <!-- 厚度0.375mm -->
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LayerType</foundation:ObjectName>
                    </property:Key>
                    <property:Value>Dielectric</property:Value>
                </foundation:UserProperty>
                <pdm:Item>ITEM_DIELECTRIC1</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第4层：内层1（电源层） -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>PowerPlane_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.165</property:Value>
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.200</property:Value> <!-- 铜厚0.035mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_POWER</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第5层：核心介质层 -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Core_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.800</property:Value>
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>1.165</property:Value> <!-- 厚度0.365mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_DIELECTRIC1</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第6层：内层2（地层） -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>GroundPlane_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.765</property:Value>
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.800</property:Value> <!-- 铜厚0.035mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_GROUND</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第7层：介质层2（底层铜箔上面的预浸料） -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Prepreg2_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.035</property:Value>
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.765</property:Value> <!-- 厚度0.730mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_DIELECTRIC1</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第8层：底层信号层 -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>BottomSignal_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.000</property:Value> <!-- 板底 -->
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.035</property:Value> <!-- 铜厚0.035mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_BOTTOM_SIGNAL</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 第9层：底层阻焊 -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>BottomSolderMask_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>LowerBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>-0.025</property:Value> <!-- 板底下方 -->
                </foundation:UserProperty>
                <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                    <property:Key>
                        <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                        <foundation:ObjectName>UpperBound</foundation:ObjectName>
                    </property:Key>
                    <property:Value>0.000</property:Value> <!-- 厚度0.025mm -->
                </foundation:UserProperty>
                <pdm:Item>ITEM_BOTTOM_SOLDERMASK</pdm:Item>
            </pdm:ItemInstance>
            
            <!-- 堆叠的引用名称 -->
            <pdm:ReferenceName>MAIN_4LAYER_STACKUP</pdm:ReferenceName>
            
            <!-- 堆叠总厚度计算 -->
            <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
                <property:Key>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>TotalThickness</foundation:ObjectName>
                </property:Key>
                <property:Value>1.650</property:Value> <!-- 1.65mm -->
            </foundation:UserProperty>
        </foundation:Item>
        
        <!-- ============ 第3步：定义层区域（Layer Zone） ============ -->
        <!-- 将堆叠应用到板子的特定区域 -->
        
        <foundation:Item id="ITEM_BOARD_ZONE" geometryType="BOARD_AREA_RIGID">
            <foundation:Name>Main Board Area</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>MainZone_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <!-- 引用层堆叠 -->
                <pdm:AssembleToName>MAIN_4LAYER_STACKUP</pdm:AssembleToName>
                <!-- 定义区域形状（简化，实际应为Polyline） -->
                <pdm:Item>ITEM_ZONE_SHAPE</pdm:Item>
            </pdm:ItemInstance>
        </foundation:Item>
        
        <!-- ============ 第4步：定义板子 ============ -->
        
        <foundation:Item id="ITEM_BOARD" geometryType="BOARD_OUTLINE">
            <foundation:Name>Main PCB Board</foundation:Name>
            <pdm:ItemType>assembly</pdm:ItemType>
            <!-- 板子轮廓几何省略 -->
            <!-- 引用层区域 -->
            <pdm:ItemInstance>
                <pdm:InstanceName>
                    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
                    <foundation:ObjectName>Board_Instance</foundation:ObjectName>
                </pdm:InstanceName>
                <pdm:Item>ITEM_BOARD_ZONE</pdm:Item>
            </pdm:ItemInstance>
        </foundation:Item>
        
    </foundation:Body>
    
</foundation:EDMDDataSet>
```

#### 🎨 **层属性的表达方式**

#### **1. 层名称（Layer Name）**
- **主要方式**：`<foundation:Name>` 元素
- **引用名称**：`<pdm:ReferenceName>`（用于其他元素引用）
- **实例名称**：`<pdm:InstanceName>`（在堆叠中的实例）

#### **2. 层类型/用途（Layer Type/Purpose）**
- **标准方式**：`geometryType` 属性（IDXv4.0+）
  ```xml
  geometryType="LAYER_SOLDERMASK"
  geometryType="LAYER_OTHERSIGNAL"
  geometryType="LAYER_POWERGROUND"
  geometryType="LAYER_SILKSCREEN"
  geometryType="LAYER_DIELECTRIC"
  ```
- **传统方式**：UserProperty "LayerType"
  ```xml
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>LayerType</foundation:ObjectName>
    </property:Key>
    <property:Value>SolderMask</property:Value>
  </foundation:UserProperty>
  ```

#### **3. 层颜色（Layer Color）**

- **非标准属性**：使用UserProperty自定义
  
  ```xml
  <foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
    <property:Key>
      <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
      <foundation:ObjectName>Color</foundation:ObjectName>
    </property:Key>
    <!-- 支持格式：十六进制、RGB、颜色名 -->
    <property:Value>#4CAF50</property:Value>
    <!-- 或 -->
    <property:Value>rgb(76, 175, 80)</property:Value>
    <!-- 或 -->
    <property:Value>Green</property:Value>
  </foundation:UserProperty>
  ```

**4. 其他层属性**

```xml
<!-- 厚度 -->
<foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
  <property:Key>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>Thickness</foundation:ObjectName>
  </property:Key>
  <property:Value>0.035</property:Value> <!-- 单位：毫米 -->
</foundation:UserProperty>

<!-- 铜厚（盎司） -->
<foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
  <property:Key>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>CopperWeight</foundation:ObjectName>
  </property:Key>
  <property:Value>1</property:Value> <!-- 1oz -->
</foundation:UserProperty>

<!-- 材料类型 -->
<foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
  <property:Key>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>Material</foundation:ObjectName>
  </property:Key>
  <property:Value>FR4</property:Value>
</foundation:UserProperty>

<!-- 介电常数 -->
<foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
  <property:Key>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>DielectricConstant</foundation:ObjectName>
  </property:Key>
  <property:Value>4.5</property:Value>
</foundation:UserProperty>

<!-- 网络名称（电源/地层） -->
<foundation:UserProperty xsi:type="property:EDMDUserSimpleProperty">
  <property:Key>
    <foundation:SystemScope>ECADSYSTEM</foundation:SystemScope>
    <foundation:ObjectName>NetName</foundation:ObjectName>
  </property:Key>
  <property:Value>VCC_3V3</property:Value>
</foundation:UserProperty>
```

### 📊 **层堆叠的Z轴坐标系**

IDX使用以下Z轴坐标系：
- **Z=0**：板子底面（Bottom）的组件安装面
- **正Z方向**：从底面指向顶面
- **负Z值**：可能用于底面下方的层（如底面阻焊）

在示例中：
- 板底：Z=0
- 板顶：Z=1.65mm（总厚度）
- 底面阻焊：Z=-0.025到0（板底下方）
- 层堆叠从Z=-0.025到Z=1.65

### 🎯 **关键概念总结**

1. **物理层定义**：每个层是独立的EDMDItem，有geometryType和ReferenceName
2. **层堆叠定义**：包含多个层实例，定义每个层的Z轴位置
3. **层区域**：将堆叠应用到板子的特定区域
4. **属性表达**：
   - 名称：Name/ReferenceName
   - 类型：geometryType 或 UserProperty
   - 颜色：自定义UserProperty
   - 其他：厚度、材料等通过UserProperty

这样设计的层系统既符合IDXv4.5标准，又足够灵活以支持各种复杂的PCB层叠结构。
