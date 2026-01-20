// ============= 几何形状类型定义 =============
// DESIGN: IDX使用2.5D几何表示法（2D轮廓+高度范围）
// REF: Section 7.1
// NOTE: 所有几何类型都遵循"translation body"概念

import { EDMDObject, EDMDLengthProperty, EDMDUserSimpleProperty, EDMDTransformation } from './base.types';

// ============= 几何描述类型 =============
/**
 * 多段线几何元素
 * 
 * @remarks
 * 由一系列点连接而成的折线，可闭合
 * REF: Section 7.1.7
 * XML: <foundation:PolyLine xsi:type="d2:EDMDPolyLine">
 */
export interface EDMDPolyLine extends EDMDObject {
	/** 点序列，引用 CartesianPoint 的 id */
	Points: string[];
	/** 可选厚度，用于表示走线或铣削路径的宽度 */
	Thickness?: EDMDLengthProperty;
	/** XML 类型声明 */
	'@type'?: 'd2:EDMDPolyLine';
}

/**
 * 圆弧几何元素
 * 
 * @remarks
 * 由起点、中间点和终点定义的圆弧
 * REF: Section 7.1.1
 */
export interface EDMDArc extends EDMDObject {
	/** 起点，引用 CartesianPoint 的 id */
	StartPoint: string;
	/** 中间点，引用 CartesianPoint 的 id */
	MidPoint: string;
	/** 终点，引用 CartesianPoint 的 id */
	EndPoint: string;
	/** XML 类型声明 */
	'@type'?: 'd2:EDMDArc';
}

/**
 * 圆心式圆几何元素
 * 
 * @remarks
 * 由圆心点和直径定义的圆
 * REF: Section 7.1.4
 */
export interface EDMDCircleCenter extends EDMDObject {
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
export interface EDMDCircle3Point extends EDMDObject {
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
export interface EDMDEllipse extends EDMDObject {
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
export interface EDMDBSplineCurve extends EDMDObject {
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
export interface EDMDCompositeCurve extends EDMDObject {
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
export interface EDMDLine extends EDMDObject {
	/** 起点，引用 CartesianPoint 的 id */
	Point: string;
	/** 方向向量，引用 CartesianPoint 的 id */
	Vector: string;
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

// ============= 2D曲线集 =============

/**
 * 2D曲线集合
 * 
 * @remarks
 * 定义几何元素的Z轴范围，实现2.5D表示
 * REF: Section 7.1
 * XML: <foundation:CurveSet2d xsi:type="d2:EDMDCurveSet2d">
 */
export interface EDMDCurveSet2D extends EDMDObject {
	/** 形状描述类型，通常为 GeometricModel */
	ShapeDescriptionType: 'GeometricModel' | 'DocumentationModel';
	/** Z轴下边界，定义曲线起始高度 */
	LowerBound: EDMDLengthProperty;
	/** Z轴上边界，定义曲线结束高度 */
	UpperBound: EDMDLengthProperty;
	/** 引用的几何元素id列表 */
	DetailedGeometricModelElements: string[];
}