// ============= 几何形状类型定义 =============
// DESIGN: IDX使用2.5D几何表示法（2D轮廓+高度范围）
// REF: Section 7.1
// NOTE: 所有几何类型都遵循"translation body"概念

import { EDMDObject, EDMDLengthProperty } from './base.types';
import { IDXD2Tag } from './namespace.types';

// ============= 几何描述类型 =============

/** 几何元素类型 */
export type GeometryKind =
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
	type: GeometryKind;
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
