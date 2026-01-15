# IDXv4.5 建模与输出简明指南
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

| 痛点             | IDX解决方案                                                  |
| :--------------- | :----------------------------------------------------------- |
| **数据失真**     | 通过精确的2.5D几何和标准化属性定义，避免了通用格式（如STEP）转换中的信息丢失。 |
| **变更管理混乱** | 内置的变更提议/响应协议，确保每一次修改都可追溯、可确认，防止设计版本分歧。 |
| **设计迭代低效** | 机械工程师可直接在3D环境中提出建议（如移动元件避开结构件），并以ECAD能直接处理的形式反馈，无需截图、邮件、口头描述。 |
| **跨领域误解**   | 提供了一套共同的语言和精确的数据模型，减少了电气与机械团队之间的沟通误差。 |

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