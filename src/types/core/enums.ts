// ============= IDX协议核心枚举类型 =============
// NOTE: 所有枚举值必须与IDXv4.5规范完全一致
// REF: PSI5_IDXv4.5_Implementation_Guidelines.pdf Tables 2-11

// ------------ 项目类型枚举 ------------
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
 * 几何类型枚举
 * 
 * @remarks
 * IDXv4.0+引入的简化方式的关键属性，直接标识项目的类型和功能
 * 替代传统方式中的"Third Item"对象，减少XML嵌套和文件大小
 * REF: Section 6.1 (Table 8), Section 6.9 (Table 8)
 */
export enum GeometryType {
	// ============= 板相关 =============
	/** 板轮廓：定义PCB板的外形轮廓和厚度 */
	BOARD_OUTLINE = 'BOARD_OUTLINE',
	/** 柔性板区域：定义柔性电路板的可弯曲区域 */
	BOARD_AREA_FLEXIBLE = 'BOARD_AREA_FLEXIBLE',
	/** 刚性板区域：定义PCB中的刚性支撑区域 */
	BOARD_AREA_RIGID = 'BOARD_AREA_RIGID',
	/** 加强板区域：定义用于增加刚性的加强区域 */
	BOARD_AREA_STIFFENER = 'BOARD_AREA_STIFFENER',

	// ============= 组件相关 =============
	/** 电气元件：标准电气元件（电阻、电容、IC等） */
	COMPONENT = 'COMPONENT',
	/** 机械元件：非电气元件（散热器、安装支架等） */
	COMPONENT_MECHANICAL = 'COMPONENT_MECHANICAL',

	// ============= 孔相关 =============
	/** 电镀孔：具有导电镀层的通孔（PTH） */
	HOLE_PLATED = 'HOLE_PLATED',
	/** 非电镀孔：无导电镀层的机械孔（NPTH） */
	HOLE_NON_PLATED = 'HOLE_NON_PLATED',
	/** 电镀铣削切口：通过铣削工艺形成的电镀切口 */
	HOLE_PLATED_MILLED = 'HOLE_PLATED_MILLED',
	/** 非电镀铣削切口：通过铣削工艺形成的非电镀切口 */
	HOLE_NONPLATED_MILLED = 'HOLE_NONPLATED_MILLED',
	/** 过孔：用于连接不同信号层的镀铜孔 */
	VIA = 'VIA',
	/** 填充过孔：内部填充材料（树脂/铜）的过孔 */
	FILLED_VIA = 'FILLED_VIA',

	// ============= 禁止区域相关 =============
	/** 布线禁布区：禁止布线的区域 */
	KEEPOUT_AREA_ROUTE = 'KEEPOUT_AREA_ROUTE',
	/** 元件禁布区：禁止放置元件的区域 */
	KEEPOUT_AREA_COMPONENT = 'KEEPOUT_AREA_COMPONENT',
	/** 过孔禁布区：禁止放置过孔的区域 */
	KEEPOUT_AREA_VIA = 'KEEPOUT_AREA_VIA',
	/** 测试点禁布区：禁止放置测试点的区域 */
	KEEPOUT_AREA_TESTPOINT = 'KEEPOUT_AREA_TESTPOINT',
	/** 热禁布区：因热考虑需要保持空旷的区域 */
	KEEPOUT_AREA_THERMAL = 'KEEPOUT_AREA_THERMAL',
	/** 其他禁布区：未分类的其他类型禁布区域 */
	KEEPOUT_AREA_OTHER = 'KEEPOUT_AREA_OTHER',

	// ============= 保持区域相关 =============
	/** 布线保持区：必须布线的区域（保持布线） */
	KEEPIN_AREA_ROUTE = 'KEEPIN_AREA_ROUTE',
	/** 元件保持区：必须放置元件的区域 */
	KEEPIN_AREA_COMPONENT = 'KEEPIN_AREA_COMPONENT',
	/** 过孔保持区：必须放置过孔的区域 */
	KEEPIN_AREA_VIA = 'KEEPIN_AREA_VIA',
	/** 测试点保持区：必须放置测试点的区域 */
	KEEPIN_AREA_TESTPOINT = 'KEEPIN_AREA_TESTPOINT',
	/** 热保持区：因热考虑需要填充的区域 */
	KEEPIN_AREA_THERMAL = 'KEEPIN_AREA_THERMAL',
	/** 其他保持区：未分类的其他类型保持区域 */
	KEEPIN_AREA_OTHER = 'KEEPIN_AREA_OTHER',

	// ============= 布局区域 =============
	/** 放置组区域：逻辑上相关的元件分组区域（不强制放置） */
	PLACEMENT_GROUP_AREA = 'PLACEMENT_GROUP_AREA',
	/** 其他轮廓/用户区域：用户自定义的未分类区域（如logo位置等） */
	OTHER_OUTLINE = 'OTHER_OUTLINE',

	// ============= 层相关 =============
	/** 阻焊层：用于防止焊锡粘附的绝缘层 */
	LAYER_SOLDERMASK = 'LAYER_SOLDERMASK',
	/** 焊膏层：用于SMT焊接的锡膏印刷层 */
	LAYER_SOLDERPASTE = 'LAYER_SOLDERPASTE',
	/** 丝印层：用于印刷标识和符号的油墨层 */
	LAYER_SILKSCREEN = 'LAYER_SILKSCREEN',
	/** 通用层：未指定具体用途的通用层 */
	LAYER_GENERIC = 'LAYER_GENERIC',
	/** 胶层：用于固定元件的粘合剂层 */
	LAYER_GLUE = 'LAYER_GLUE',
	/** 胶掩膜层：定义胶层应用区域的掩膜 */
	LAYER_GLUEMASK = 'LAYER_GLUEMASK',
	/** 焊膏掩膜层：定义焊膏应用区域的掩膜 */
	LAYER_PASTEMASK = 'LAYER_PASTEMASK',
	/** 其他信号层：常规信号走线层 */
	LAYER_OTHERSIGNAL = 'LAYER_OTHERSIGNAL',
	/** 仅焊盘层：只包含焊盘连接点的层 */
	LAYER_LANDSONLY = 'LAYER_LANDSONLY',
	/** 电源/地层：用于电源分配和接地的层 */
	LAYER_POWERGROUND = 'LAYER_POWERGROUND',
	/** 嵌入式电容介质层：用于嵌入式电容的介质材料层 */
	LAYER_EMBEDDED_CAP_DIELECTRIC = 'LAYER_EMBEDDED_CAP_DIELECTRIC',
	/** 嵌入式电阻层：用于嵌入式电阻的材料层 */
	LAYER_EMBEDDED_RESISTOR = 'LAYER_EMBEDDED_RESISTOR',
	/** 介质层：绝缘隔离材料层（FR4等） */
	LAYER_DIELECTRIC = 'LAYER_DIELECTRIC',
	/** 层堆叠定义：多个物理层的堆叠顺序定义 */
	LAYER_STACKUP = 'LAYER_STACKUP',
	/** 通用层定义：未指定类型的通用层（兼容性） */
	LAYER = 'LAYER',

	// ============= 弯曲区域 =============
	/** 弯曲区域：定义柔性板的弯曲位置和参数 */
	BEND = 'BEND',

	// ============= 铜相关 =============
	/** 铜焊盘：元件引脚的铜连接区域 */
	COPPER_PAD = 'COPPER_PAD',
	/** 铜走线：信号连接的铜线条 */
	COPPER_TRACE = 'COPPER_TRACE',
	/** 铜皮区域：大面积的铜填充区域（用于接地/电源） */
	COPPER_AREA = 'COPPER_AREA',
}

// ------------ 层和地层相关枚举 ------------
/**
 * 地层类型枚举
 *
 * @remarks
 * 定义PCB板的层类型
 * REF: Section 6.1.2
 */
export enum StratumType {
	/** 设计层（物理层） */
    DesignLayerStratum = 'DesignLayerStratum',
    /** 文档层（非物理层） */
    DocumentationLayerStratum = 'DocumentationLayerStratum'
}

/**
 * 地层表面指定枚举
 *
 * @remarks
 * 定义层在板中的位置
 */
export enum StratumSurfaceDesignation {
	/** 主表面（通常为板顶面或底面） */
    PrimarySurface = 'PrimarySurface',
    /** 次表面 */
    SecondarySurface = 'SecondarySurface'
}

/**
 * 层目的枚举
 *
 * @remarks
 * 定义PCB层的功能和用途
 * REF: Section 6.1.2, Table 4
 */
export enum LayerPurpose {
	SOLDERMASK = 'SolderMask',
	SOLDERPASTE = 'SolderPaste',
	SILKSCREEN = 'SilkScreen',
	GENERIC = 'GenericLayer',
	GLUE = 'Glue',
	GLUEMASK = 'GlueMask',
	PASTEMASK = 'PasteMask',
	OTHERSIGNAL = 'OtherSignal',
	LANDSONLY = 'LandsOnly',
	POWERGROUND = 'PowerOrGround',
	EMBEDDED_CAP_DIELECTRIC = 'EmbeddedPassiveCapacitorDielectric',
	EMBEDDED_RESISTOR = 'EmbeddedPassiveResistor',
	DIELECTRIC = 'Dielectric',
}

// ------------ 保持区域约束目的枚举 ------------
/**
 * 保持区域约束目的枚举
 *
 * @remarks
 * 定义保持区域的功能和限制类型
 * REF: Section 6.5, Tables 6-7
 */
export enum KeepConstraintPurpose {
	ROUTE = 'Route',
	COMPONENT_PLACEMENT = 'ComponentPlacement',
	VIA = 'Via',
	TEST_POINT = 'TestPoint',
	THERMAL = 'Thermal',
	GENERIC_CLEARANCE = 'GenericClearance',
	SHOCK = 'Shock',
	VIBRATION = 'Vibration',
	ELECTROMAGNETIC_COMPATIBILITY = 'ElectromagneticCompatibility',
	VALUE_LIMIT = 'ValueLimit',
	PLANE = 'Plane',
	OTHER = 'Other',
}

// ------------ 层间特征类型枚举 ------------
/**
 * 层间特征类型枚举
 *
 * @remarks
 * 定义跨越多层的特征类型，如孔、过孔等
 * REF: Section 6.3, Table 5
 */
export enum InterStratumFeatureType {
	CUTOUT = 'Cutout',
	PLATED_CUTOUT = 'PlatedCutout',
	MILLED_CUTOUT = 'MilledCutout',
	PARTIALLY_PLATED_CUTOUT = 'PartiallyPlatedCutout',
	VIA = 'Via',
	FILLED_VIA = 'FilledVia',
	PLATED_PASSAGE = 'PlatedPassage',
	UNSUPPORTED_PASSAGE = 'UnsupportedPassage',
}

// ------------ 装配组件类型枚举 ------------
/**
 * 装配组件类型枚举
 *
 * @remarks
 * 定义组件类型（电气/机械）
 * REF: Section 6.2
 */
export enum AssemblyComponentType {
	PHYSICAL = 'Physical',
	MECHANICAL_ITEM = 'MechanicalItem',
	ASSEMBLY_GROUP_COMPONENT = 'AssemblyGroupComponent',
	LAMINATE_COMPONENT = 'LaminateComponent',
	THERMAL_COMPONENT = 'ThermalComponent',
	PADSTACK = 'Padstack',
}

// ------------ 形状元素类型枚举 ------------
/**
 * 形状元素类型枚举
 * 
 * @remarks
 * 定义形状元素的功能和用途
 * REF: Section 6.9 (Table 8)
 */
export enum ShapeElementType {
	/** 特征形状元素（最常用） */
	FeatureShapeElement = 'FeatureShapeElement',
	/** 零件安装特征（用于孔、铣削切口等） */
	PartMountingFeature = 'PartMountingFeature',
	/** 非特征形状元素（用于弯曲区域等） */
	NonFeatureShapeElement = 'NonFeatureShapeElement',
	/** 零件特征 */
	PartFeature = 'PartFeature',
	/** 元件端子（用于引脚定义） */
	ComponentTermination = 'ComponentTermination',
	/** 设计层 */
	DesignLayerStratum = 'DesignLayerStratum'
}

// ------------ 功能形状类型枚举 ------------
/**
 * 功能形状类型枚举
 *
 * @remarks
 * 定义特殊功能形状的类型
 * REF: Section 6.1.2.3
 */
export enum FunctionalItemShapeType {
	FLEXIBLE_AREA = 'FlexibleArea',
	RIGID_AREA = 'RigidArea',
	STIFFENER = 'Stiffener',
	PLACEMENT_GROUP_AREA = 'PlacementGroupArea',
	USER_AREA = 'UserArea',
	MECHANICAL_ITEM = 'MechanicalItem',
}

// ------------ 技术类型枚举 ------------
/**
 * 技术类型枚举
 *
 * @remarks
 * 定义层技术类型（设计/文档）
 * REF: Section 6.8
 */
export enum TechnologyType {
	DESIGN = 'Design',
	DOCUMENTATION = 'Documentation',
}

// ------------ 弯曲类型相关枚举 ------------
/**
 * 弯曲侧面枚举
 *
 * @remarks
 * 定义弯曲的内侧或外侧
 * REF: Section 6.1.2.4
 */
export enum BendSide {
	TOP = 'Top',
	BOTTOM = 'Bottom',
}

/**
 * 弯曲类型枚举
 *
 * @remarks
 * 目前仅支持圆形弯曲
 */
export enum BendTypeEnum {
	CIRCULAR_BEND = 'CircularBend',
}
