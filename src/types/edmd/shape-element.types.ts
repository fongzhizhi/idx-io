import { EDMDObject } from './base.types';

// ============= 形状元素 =============

/**
 * 形状元素
 *
 * @remarks
 * 连接曲线集和项目定义的中介，支持布尔运算
 * REF: Section 4.1.2 (Table 2)
 * XML: <foundation:ShapeElement xsi:type="pdm:EDMDShapeElement">
 */
export interface EDMDShapeElement extends EDMDObject {
	/** 形状元素类型 */
	ShapeElementType: ShapeElementType;
	/** 布尔运算标记：false=添加材料，true=减去材料 */
	Inverted: boolean;
	/** 引用的曲线集id */
	DefiningShape: string;
}

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
	DesignLayerStratum = 'DesignLayerStratum',
}

// ============= 传统方式建模的类型定义 =============
/**
 * 传统方式Third Item联合类型
 */
export type EDMDThirdItem = EDMDStratum | EDMDAssemblyComponent | EDMDInterStratumFeature | EDMDKeepOut | EDMDKeepIn | EDMDFunctionalItemShape;

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
}
