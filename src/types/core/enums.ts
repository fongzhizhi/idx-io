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
	SINGLE = 'single',
	ASSEMBLY = 'assembly',
}

/**
 * 几何类型枚举
 *
 * @remarks
 * IDXv4.0引入的简化项目分类方式
 * REF: Section 4.1.2.2, Table 8
 */
/**
 * 几何类型枚举（统一版本）
 *
 * @remarks
 * IDXv4.0引入的简化项目分类方式，合并了ge
 * REF: Section 4.1.2.2, Table 8
 */
export enum GeometryType {
	// 板相关
	BOARD_OUTLINE = 'BOARD_OUTLINE',
	BOARD_AREA_FLEXIBLE = 'BOARD_AREA_FLEXIBLE',
	BOARD_AREA_RIGID = 'BOARD_AREA_RIGID',
	BOARD_AREA_STIFFENER = 'BOARD_AREA_STIFFENER',

	// 组件相关
	COMPONENT = 'COMPONENT',
	COMPONENT_MECHANICAL = 'COMPONENT_MECHANICAL',

	// 孔相关
	HOLE_PLATED = 'HOLE_PLATED',
	HOLE_NON_PLATED = 'HOLE_NON_PLATED',
	HOLE_PLATED_MILLED = 'HOLE_PLATED_MILLED',
	HOLE_NONPLATED_MILLED = 'HOLE_NONPLATED_MILLED',
	VIA = 'VIA',
	FILLED_VIA = 'FILLED_VIA',

	// 禁止区域相关
	KEEPOUT_AREA_ROUTE = 'KEEPOUT_AREA_ROUTE',
	KEEPOUT_AREA_COMPONENT = 'KEEPOUT_AREA_COMPONENT',
	KEEPOUT_AREA_VIA = 'KEEPOUT_AREA_VIA',
	KEEPOUT_AREA_TESTPOINT = 'KEEPOUT_AREA_TESTPOINT',
	KEEPOUT_AREA_THERMAL = 'KEEPOUT_AREA_THERMAL',
	KEEPOUT_AREA_OTHER = 'KEEPOUT_AREA_OTHER',

	// 保持区域相关
	KEEPIN_AREA_ROUTE = 'KEEPIN_AREA_ROUTE',
	KEEPIN_AREA_COMPONENT = 'KEEPIN_AREA_COMPONENT',
	KEEPIN_AREA_VIA = 'KEEPIN_AREA_VIA',
	KEEPIN_AREA_TESTPOINT = 'KEEPIN_AREA_TESTPOINT',
	KEEPIN_AREA_THERMAL = 'KEEPIN_AREA_THERMAL',
	KEEPIN_AREA_OTHER = 'KEEPIN_AREA_OTHER',

	// 布局区域
	PLACEMENT_GROUP_AREA = 'PLACEMENT_GROUP_AREA',
	OTHER_OUTLINE = 'OTHER_OUTLINE',

	// 层相关
	LAYER_SOLDERMASK = 'LAYER_SOLDERMASK',
	LAYER_SOLDERPASTE = 'LAYER_SOLDERPASTE',
	LAYER_SILKSCREEN = 'LAYER_SILKSCREEN',
	LAYER_GENERIC = 'LAYER_GENERIC',
	LAYER_GLUE = 'LAYER_GLUE',
	LAYER_GLUEMASK = 'LAYER_GLUEMASK',
	LAYER_PASTEMASK = 'LAYER_PASTEMASK',
	LAYER_OTHERSIGNAL = 'LAYER_OTHERSIGNAL',
	LAYER_LANDSONLY = 'LAYER_LANDSONLY',
	LAYER_POWERGROUND = 'LAYER_POWERGROUND',
	LAYER_EMBEDDED_CAP_DIELECTRIC = 'LAYER_EMBEDDED_CAP_DIELECTRIC',
	LAYER_EMBEDDED_RESISTOR = 'LAYER_EMBEDDED_RESISTOR',
	LAYER_DIELECTRIC = 'LAYER_DIELECTRIC',
	LAYER_STACKUP = 'LAYER_STACKUP',
	LAYER = 'LAYER',

	// 弯曲区域
	BEND = 'BEND',

	// 铜相关
	COPPER_PAD = 'COPPER_PAD',
	COPPER_TRACE = 'COPPER_TRACE',
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
	DESIGN_LAYER_STRATUM = 'DesignLayerStratum',
	PHYSICAL_LAYER_STRATUM = 'PhysicalLayerStratum',
}

/**
 * 地层表面指定枚举
 *
 * @remarks
 * 定义层在板中的位置
 */
export enum StratumSurfaceDesignation {
	PRIMARY_SURFACE = 'PrimarySurface',
	SECONDARY_SURFACE = 'SecondarySurface',
	INNER_LAYER = 'InnerLayer',
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
 * 定义几何形状元素的类型
 * REF: Section 4.1.2.1, Table 2
 */
export enum ShapeElementType {
	FEATURE_SHAPE_ELEMENT = 'FeatureShapeElement',
	NON_FEATURE_SHAPE_ELEMENT = 'NonFeatureShapeElement',
	PART_FEATURE = 'PartFeature',
	PART_MOUNTING_FEATURE = 'PartMountingFeature',
	COMPONENT_TERMINAL = 'ComponentTerminal',
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
