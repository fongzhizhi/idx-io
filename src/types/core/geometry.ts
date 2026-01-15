// ============= 几何形状类型定义 =============
// DESIGN: IDX使用2.5D几何表示法（2D轮廓+高度范围）
// REF: Section 7.1
// NOTE: 所有几何类型都遵循"translation body"概念

import { EDMDObject, CartesianPoint, EDMDLengthProperty } from './common';
import { ShapeElementType, BendTypeEnum, BendSide } from './enums';

// ------------ 基础曲线类型 ------------
/**
 * 几何曲线的基接口
 */
export interface EDMDCurve extends EDMDObject {
  /** 曲线类型标识 */
  curveType: string;
}

/**
 * 圆弧曲线
 */
export interface EDMDArc extends EDMDCurve {
  curveType: 'EDMDArc';
  StartPoint: CartesianPoint;
  EndPoint: CartesianPoint;
  IntermediatePoint: CartesianPoint;
}

/**
 * B样条曲线
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
 */
export interface EDMDCircle3Point extends EDMDCurve {
  curveType: 'EDMDCircle3Point';
  Point1: CartesianPoint;
  Point2: CartesianPoint;
  Point3: CartesianPoint;
}

/**
 * 通过圆心和直径定义的圆
 */
export interface EDMDCircleCenter extends EDMDCurve {
  curveType: 'EDMDCircleCenter';
  CenterPoint: CartesianPoint;
  Diameter: EDMDLengthProperty;
}

/**
 * 椭圆曲线
 */
export interface EDMDEllipse extends EDMDCurve {
  curveType: 'EDMDEllipse';
  CenterPoint: CartesianPoint;
  SemiMajorAxis: EDMDLengthProperty;
  SemiMinorAxis: EDMDLengthProperty;
}

/**
 * 抛物线曲线
 */
export interface EDMDParabola extends EDMDCurve {
  curveType: 'EDMDParabola';
  Focus: CartesianPoint;
  Apex: CartesianPoint;
}

/**
 * 折线（多段线）
 */
export interface EDMDPolyLine extends EDMDCurve {
  curveType: 'EDMDPolyLine';
  Points: CartesianPoint[];
  Thickness?: EDMDLengthProperty;
  Closed?: boolean;
}

/**
 * 复合曲线
 */
export interface EDMDCompositeCurve extends EDMDCurve {
  curveType: 'EDMDCompositeCurve';
  Segments: Array<{
    Curve: EDMDCurve;
    SameSense: boolean;
  }>;
}

/**
 * 直线段
 */
export interface EDMDLine extends EDMDCurve {
  curveType: 'EDMDLine';
  Point: CartesianPoint;
  Vector: CartesianPoint;
}

// ============= 2.5D几何体类型 =============
/**
 * 2D曲线集合，用于定义"translation body"
 */
export interface EDMDCurveSet2D extends EDMDObject {
  /** 形状描述类型 */
  ShapeDescriptionType: 'GeometricModel' | 'Implicit';
  
  /** Z轴下界（相对于参考面） */
  LowerBound: EDMDLengthProperty;
  
  /** Z轴上界（相对于参考面） */
  UpperBound: EDMDLengthProperty;
  
  /** 组成曲线集的详细几何元素 */
  DetailedGeometricModelElement: Array<EDMDCurve | string>;
  
  /** 可选的厚度属性，用于特殊几何（如走线） */
  Thickness?: EDMDLengthProperty;
}

/**
 * 形状元素，连接曲线集和具体项目
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
 */
export interface EDMDExtShape extends EDMDObject {
  /** 文件位置URI */
  Location: string;
  
  /** 文件格式（STEP, STL, IGES等） */
  Format: string;
  
  /** 文件格式版本 */
  FormatVersion?: string;
}

// ============= 所有曲线类型的联合 =============
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
 */
export type ShapeType = 
  | EDMDCurveSet2D 
  | EDMDShapeElement 
  | EDMDExtShape;
