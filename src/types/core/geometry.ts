// ============= 几何形状类型定义 =============
// DESIGN: IDX使用2.5D几何表示法（2D轮廓+高度范围）
// REF: Section 7.1
// NOTE: 所有几何类型都遵循"translation body"概念

import { EDMDObject, CartesianPoint, EDMDLengthProperty, EDMDUserSimpleProperty, EDMDTransformation } from './common';
import {
	ShapeElementType,
	KeepConstraintPurpose,
	InterStratumFeatureType,
	AssemblyComponentType,
	FunctionalItemShapeType,
	StratumType,
	StratumSurfaceDesignation,
	TechnologyType,
	LayerPurpose,
	BendTypeEnum,
	BendSide,
} from './enums';

// ============= 基础几何元素类型 =============
// REF: IDXv4.5规范，用于XML序列化的具体几何元素

/**
 * 笛卡尔点元素
 *
 * @remarks
 * IDX中最基础的几何元素，表示2D平面上的一个点
 * REF: geometry.d2.xsd - EDMDCartesianPoint
 */
export interface EDMDCartesianPointElement {
	/** 元素唯一标识符 */
	id: string;
	/** XSI类型标识 */
	'xsi:type': 'd2:EDMDCartesianPoint';
	/** X坐标属性 */
	X: { 'property:Value': string };
	/** Y坐标属性 */
	Y: { 'property:Value': string };
}

/**
 * 圆心圆元素
 *
 * @remarks
 * 通过圆心点和直径定义的圆形几何元素
 * REF: geometry.d2.xsd - EDMDCircleCenter
 */
export interface EDMDCircleCenterElement {
	/** 元素唯一标识符 */
	id: string;
	/** XSI类型标识 */
	'xsi:type': 'd2:EDMDCircleCenter';
	/** 圆心点引用 */
	'd2:CenterPoint': string;
	/** 直径属性 */
	'd2:Diameter': { 'property:Value': string };
}

/**
 * 多边形线元素
 *
 * @remarks
 * 由一系列点连接形成的多边形或折线
 * REF: geometry.d2.xsd - EDMDPolyLine
 */
export interface EDMDPolyLineElement {
	/** 元素唯一标识符 */
	id: string;
	/** 元素类型 */
	type: 'PolyLine';
	/** 点引用数组 */
	Point: Array<{ 'd2:Point': string }>;
}

/**
 * 曲线集2D元素
 *
 * @remarks
 * 定义2.5D几何体的核心元素，包含2D轮廓和Z轴范围
 * REF: geometry.d2.xsd - EDMDCurveSet2d
 */
export interface EDMDCurveSet2DElement {
	/** 元素唯一标识符 */
	id: string;
	/** XSI类型标识 */
	'xsi:type': 'd2:EDMDCurveSet2d';
	/** 形状描述类型 */
	'pdm:ShapeDescriptionType': 'GeometricModel';
	/** Z轴下界 */
	'd2:LowerBound': { 'property:Value': string };
	/** Z轴上界 */
	'd2:UpperBound': { 'property:Value': string };
	/** 详细几何模型元素数组 - 修复：支持字符串引用和嵌套结构 */
	'd2:DetailedGeometricModelElement':
		| string
		| Array<{
				'd2:DetailedGeometricModelElement': string;
		  }>;
}

/**
 * 形状元素
 *
 * @remarks
 * 连接曲线集和具体项目的形状定义
 * REF: pdm.xsd - ShapeElement
 */
export interface EDMDShapeElementData {
	/** 元素唯一标识符 */
	id: string;
	/** 形状元素类型 */
	'pdm:ShapeElementType': string;
	/** 是否反转（减去材料） */
	'pdm:Inverted': string;
	/** 定义形状的曲线集引用 */
	'pdm:DefiningShape': string;
}

/**
 * 层元素
 *
 * @remarks
 * PCB层的几何表示，包含形状元素和层属性
 * REF: pdm.xsd - EDMDStratum
 */
export interface EDMDStratumElement {
	/** 元素唯一标识符 */
	id: string;
	/** XSI类型标识 */
	'xsi:type': 'pdm:EDMDStratum';
	/** 形状元素引用 */
	'pdm:ShapeElement': string;
	/** 层类型 */
	'pdm:StratumType': string;
	/** 层表面指定 */
	'pdm:StratumSurfaceDesignation': string;
}

/**
 * 基础几何元素联合类型
 *
 * @remarks
 * 用于类型安全的几何元素处理
 */
export type GeometricElement = EDMDCartesianPointElement | EDMDCircleCenterElement | EDMDPolyLineElement;

/**
 * 形状相关元素联合类型
 */
export type ShapeElementData = EDMDShapeElementData;

/**
 * 层相关元素联合类型
 */
export type StratumElementData = EDMDStratumElement;

// ------------ 基础曲线类型 ------------
/**
 * 几何曲线的基接口
 *
 * @remarks
 * 所有曲线类型都扩展自这个接口
 * DESIGN: 使用继承层次，便于类型检查和扩展
 */
export interface EDMDCurve extends EDMDObject {
	/** 曲线类型标识 */
	curveType: string;
}

/**
 * 圆弧曲线
 *
 * @remarks
 * 通过起点、终点和中间点定义圆弧
 * REF: Section 7.1.1
 */
export interface EDMDArc extends EDMDCurve {
	curveType: 'EDMDArc';
	StartPoint: CartesianPoint;
	EndPoint: CartesianPoint;
	IntermediatePoint: CartesianPoint;
}

/**
 * B样条曲线
 *
 * @remarks
 * 用于表示复杂自由曲线
 * REF: Section 7.1.2
 */
export interface EDMDBSplineCurve extends EDMDCurve {
	curveType: 'EDMDBSplineCurve';
	ControlPoints: CartesianPoint[];
	Degree: number;
	ClosedCurve?: boolean;
	SelfIntersect?: boolean;
}

/**
 * 通过三点定义的圆
 *
 * @remarks
 * 三个点确定一个圆
 * REF: Section 7.1.3
 */
export interface EDMDCircle3Point extends EDMDCurve {
	curveType: 'EDMDCircle3Point';
	Point1: CartesianPoint;
	Point2: CartesianPoint;
	Point3: CartesianPoint;
}

/**
 * 通过圆心和直径定义的圆
 *
 * @remarks
 * 最常见的圆表示方法
 * REF: Section 7.1.4
 */
export interface EDMDCircleCenter extends EDMDCurve {
	curveType: 'EDMDCircleCenter';
	CenterPoint: CartesianPoint;
	Diameter: EDMDLengthProperty;
}

/**
 * 椭圆曲线
 *
 * @remarks
 * 通过中心点、半长轴和半短轴定义
 * REF: Section 7.1.5
 */
export interface EDMDEllipse extends EDMDCurve {
	curveType: 'EDMDEllipse';
	CenterPoint: CartesianPoint;
	SemiMajorAxis: EDMDLengthProperty;
	SemiMinorAxis: EDMDLengthProperty;
}

/**
 * 抛物线曲线
 *
 * @remarks
 * 通过焦点和顶点定义
 * REF: Section 7.1.6
 */
export interface EDMDParabola extends EDMDCurve {
	curveType: 'EDMDParabola';
	Focus: CartesianPoint;
	Apex: CartesianPoint;
}

/**
 * 折线（多段线）
 *
 * @remarks
 * 由一系列点连接的线段组成
 * REF: Section 7.1.7
 * BUSINESS: 常用于PCB轮廓和走线
 */
export interface EDMDPolyLine extends EDMDCurve {
	curveType: 'EDMDPolyLine';
	Points: CartesianPoint[];
	Thickness?: EDMDLengthProperty; // 用于表示走线宽度
	Closed?: boolean; // 是否闭合形成多边形
}

/**
 * 复合曲线
 *
 * @remarks
 * 由多个曲线段组合而成
 * REF: Section 7.1.8
 */
export interface EDMDCompositeCurve extends EDMDCurve {
	curveType: 'EDMDCompositeCurve';
	Segments: Array<{
		Curve: EDMDCurve;
		SameSense: boolean; // 方向是否一致
	}>;
}

/**
 * 直线段
 *
 * @remarks
 * 通过点和向量定义直线
 */
export interface EDMDLine extends EDMDCurve {
	curveType: 'EDMDLine';
	Point: CartesianPoint;
	Vector: CartesianPoint;
}

// ============= 2.5D几何体类型 =============
/**
 * 2D曲线集合，用于定义"translation body"
 *
 * @remarks
 * 核心的2.5D几何表示：2D曲线 + Z轴范围
 * DESIGN: 通过上下界定义几何体的高度范围
 * REF: Section 7.1
 */
export interface EDMDCurveSet2D extends EDMDObject {
	/** 形状描述类型 - 根据需求 9.4 扩展支持的值 */
	ShapeDescriptionType: 'GeometricModel' | 'OUTLINE' | 'Implicit' | 'SimplifiedModel';

	/** Z轴下界（相对于参考面） */
	LowerBound: EDMDLengthProperty;

	/** Z轴上界（相对于参考面） */
	UpperBound: EDMDLengthProperty;

	/** 组成曲线集的详细几何元素 */
	DetailedGeometricModelElement: Array<EDMDCurve | string>; // string用于引用已定义的曲线

	/** 可选的厚度属性，用于特殊几何（如走线） */
	Thickness?: EDMDLengthProperty;
}

/**
 * 形状元素，连接曲线集和具体项目
 *
 * @remarks
 * 形状元素定义了曲线集如何应用于项目（添加或减去材料）
 * REF: Section 4.1.2.1
 */
export interface EDMDShapeElement extends EDMDObject {
	/** 形状元素类型 */
	ShapeElementType: ShapeElementType;

	/** 定义形状的曲线集 */
	DefiningShape: EDMDCurveSet2D;

	/** 是否反转（true表示减去材料，false表示添加材料） */
	Inverted: boolean;
}

/**
 * 外部文件形状表示
 *
 * @remarks
 * 通过外部文件隐式表示形状（如STEP、STL文件）
 * REF: Section 7.1.9
 */
export interface EDMDExtShape extends EDMDObject {
	/** 文件位置URI */
	Location: string;

	/** 文件格式（STEP, STL, IGES等） */
	Format: string;

	/** 文件格式版本 */
	FormatVersion?: string;
}

// ============= 特殊形状类型 =============
/**
 * 保持区域形状
 *
 * @remarks
 * 定义禁止或限制区域
 * REF: Section 6.5
 */
export interface EDMDKeepOut extends EDMDObject {
	/** 保持区域约束目的 */
	Purpose: KeepConstraintPurpose;

	/** 引用的形状元素 */
	ShapeElement: EDMDShapeElement;

	/** 可选的附加属性 */
	Properties?: EDMDUserSimpleProperty[];
}

/**
 * 保持内部区域形状
 *
 * @remarks
 * 定义必须包含内容的区域
 */
export interface EDMDKeepIn extends EDMDObject {
	/** 保持区域约束目的 */
	Purpose: KeepConstraintPurpose;

	/** 引用的形状元素 */
	ShapeElement: EDMDShapeElement;
}

/**
 * 层间特征形状
 *
 * @remarks
 * 跨越多个层的特征，如孔和过孔
 * REF: Section 6.3
 */
export interface EDMDInterStratumFeature extends EDMDObject {
	/** 层间特征类型 */
	InterStratumFeatureType: InterStratumFeatureType;

	/** 引用的形状元素 */
	ShapeElement: EDMDShapeElement;

	/** 相关的地层（层） */
	Stratum?: EDMDStratum;
}

/**
 * 装配组件形状
 *
 * @remarks
 * 定义电气或机械组件
 * REF: Section 6.2
 */
export interface EDMDAssemblyComponent extends EDMDObject {
	/** 装配组件类型 */
	AssemblyComponentType: AssemblyComponentType;

	/** 引用的形状元素 */
	ShapeElement: EDMDShapeElement;
}

/**
 * 功能项目形状
 *
 * @remarks
 * 具有特殊功能的形状区域
 * REF: Section 6.1.2.3
 */
export interface EDMDFunctionalItemShape extends EDMDObject {
	/** 功能形状类型 */
	FunctionalItemShapeType: FunctionalItemShapeType;

	/** 引用的形状元素 */
	ShapeElement: EDMDShapeElement;

	/** 可选的附加属性 */
	Properties?: EDMDUserSimpleProperty[];
}

/**
 * 地层（层）形状
 *
 * @remarks
 * PCB层的几何表示
 * REF: Section 6.1.2
 */
export interface EDMDStratum extends EDMDObject {
	/** 地层类型 */
	StratumType: StratumType;

	/** 地层表面指定 */
	StratumSurfaceDesignation?: StratumSurfaceDesignation;

	/** 引用的形状元素 */
	ShapeElement: EDMDShapeElement | EDMDShapeElement[];

	/** 相关的地层技术 */
	StratumTechnology?: EDMDStratumTechnology;
}

/**
 * 地层技术定义
 *
 * @remarks
 * 定义层的技术和目的
 * REF: Section 6.8
 */
export interface EDMDStratumTechnology extends EDMDObject {
	/** 技术类型 */
	TechnologyType: TechnologyType;

	/** 层目的 */
	LayerPurpose: LayerPurpose;
}

/**
 * 弯曲形状
 *
 * @remarks
 * 用于柔性板的弯曲区域
 * REF: Section 6.1.2.4
 */
export interface EDMDBend extends EDMDObject {
	/** 弯曲类型 */
	BendType: BendType;

	/** 弯曲线定义 */
	BendLine: EDMDLine;

	/** 弯曲区域形状元素 */
	ShapeElement: EDMDShapeElement;
}

/**
 * 圆形弯曲类型
 *
 * @remarks
 * 目前唯一支持的弯曲类型
 */
export interface EDMCircularBendType {
	BendType: BendTypeEnum.CIRCULAR_BEND;
	InnerSide: BendSide;
	InnerRadius: EDMDLengthProperty;
	InnerAngle: EDMDLengthProperty; // 角度，单位度
}

export type BendType = EDMCircularBendType;

// ============= 3D模型引用类型 =============
/**
 * 3D模型引用
 *
 * @remarks
 * IDXv4.0支持引用外部3D模型文件
 * REF: Section 6.2.1.3
 */
export interface EDMD3DModel extends EDMDObject {
	/** 模型标识符（文件名或文档ID） */
	ModelIdentifier: string;

	/** 模型版本/配置 */
	ModelVersion?: string;

	/** 模型位置（相对路径） */
	ModelLocation?: string;

	/** MCAD格式（SolidWorks, NX, STEP等） */
	MCADFormat: string;

	/** MCAD格式版本 */
	MCADFormatVersion?: string;

	/** 变换矩阵（对齐模型与足迹） */
	Transformation?: EDMDTransformation;

	/** 变换参考（替代变换矩阵） */
	TransformationReference?: string;
}

// ============= 几何类型联合 =============
/**
 * 所有曲线类型的联合
 *
 * @remarks
 * 用于类型安全的曲线处理
 */
export type CurveType =
	| EDMDArc
	| EDMDBSplineCurve
	| EDMDCircle3Point
	| EDMDCircleCenter
	| EDMDEllipse
	| EDMDParabola
	| EDMDPolyLine
	| EDMDCompositeCurve
	| EDMDLine;

/**
 * 所有形状类型的联合
 *
 * @remarks
 * 用于类型安全的形状处理
 */
export type ShapeType =
	| EDMDCurveSet2D
	| EDMDShapeElement
	| EDMDExtShape
	| EDMDKeepOut
	| EDMDKeepIn
	| EDMDInterStratumFeature
	| EDMDAssemblyComponent
	| EDMDFunctionalItemShape
	| EDMDStratum
	| EDMDBend;
