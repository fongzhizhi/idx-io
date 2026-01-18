// ============= 禁止区构建器类型定义 =============
// DESIGN: 支持多种禁止区域类型的类型定义
// REF: IDXv4.5规范第6.5节，表6-7支持的禁止区类型
// BUSINESS: 禁止区用于定义设计约束，确保机械和电气兼容性

import { 
  StandardGeometryType, KeepConstraintPurpose, ShapeElementType 
} from '../core';

// ============= 基础类型 =============

/** 禁止区几何类型联合类型 */
export type KeepoutGeometryType = 
  | StandardGeometryType.KEEPOUT_AREA_ROUTE
  | StandardGeometryType.KEEPOUT_AREA_COMPONENT
  | StandardGeometryType.KEEPOUT_AREA_VIA
  | StandardGeometryType.KEEPOUT_AREA_TESTPOINT
  | StandardGeometryType.KEEPOUT_AREA_THERMAL
  | StandardGeometryType.KEEPOUT_AREA_OTHER;

/** 保持内部区域几何类型联合类型 */
export type KeeninGeometryType = 
  | StandardGeometryType.KEEPIN_AREA_ROUTE
  | StandardGeometryType.KEEPIN_AREA_COMPONENT
  | StandardGeometryType.KEEPIN_AREA_VIA
  | StandardGeometryType.KEEPIN_AREA_TESTPOINT
  | StandardGeometryType.KEEPIN_AREA_THERMAL
  | StandardGeometryType.KEEPIN_AREA_OTHER;

/** 约束类型枚举 */
export type ConstraintType = 'route' | 'component' | 'via' | 'testpoint' | 'thermal' | 'other';

/** 形状类型枚举 */
export type ShapeType = 'rectangle' | 'circle' | 'polygon';

// ============= 输入数据接口 =============

/**
 * 禁止区数据接口
 * 
 * @remarks
 * 描述PCB上的禁止区域约束
 * BUSINESS: 必须指定约束类型、几何形状和应用层
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 组件放置禁止区
 * const keepoutData: KeepoutData = {
 *   id: 'KO1',
 *   name: '散热器下方禁止区',
 *   constraintType: 'component',
 *   purpose: KeepConstraintPurpose.COMPONENT_PLACEMENT,
 *   shape: {
 *     type: 'rectangle',
 *     points: [
 *       { x: 10, y: 10 },
 *       { x: 50, y: 10 },
 *       { x: 50, y: 30 },
 *       { x: 10, y: 30 }
 *     ]
 *   },
 *   height: {
 *     min: 0,
 *     max: 5
 *   },
 *   layer: 'TOP'
 * };
 * ```
 */
export interface KeepoutData {
  /** 禁止区唯一标识符 */
  id: string;
  
  /** 禁止区名称 */
  name?: string;
  
  /** 约束类型 */
  constraintType: ConstraintType;
  
  /** 约束目的（更详细的分类） */
  purpose: KeepConstraintPurpose;
  
  /** 禁止区形状 */
  shape: KeepoutShape;
  
  /** 高度限制（可选） */
  height?: {
    /** 最小高度（相对于参考面） */
    min: number;
    /** 最大高度（相对于参考面），Infinity表示无上限 */
    max: number | 'infinity';
  };
  
  /** 应用层 */
  layer: string;
  
  /** 是否启用 */
  enabled?: boolean;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

/** 禁止区形状定义 */
export interface KeepoutShape {
  type: ShapeType;
  points: Array<{ x: number; y: number }>;
  radius?: number; // 仅圆形需要
}

// ============= 内部处理接口 =============

/** 处理后的禁止区数据 */
export interface ProcessedKeepoutData {
  id: string;
  name: string;
  constraintType: ConstraintType;
  purpose: KeepConstraintPurpose;
  geometryType: KeepoutGeometryType;
  shape: ProcessedKeepoutShape;
  height: {
    min: number;
    max: number;
  };
  layer: string;
  enabled: boolean;
  properties?: Record<string, any>;
}

/** 处理后的禁止区形状 */
export interface ProcessedKeepoutShape {
  type: ShapeType;
  points: Array<{ x: number; y: number; id: string }>;
  radius?: number;
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/** 禁止区几何数据 */
export interface KeepoutGeometryData {
  geometricElements: any[];
  curveSet2Ds: any[];
  shapeElements: any[];
  shapeElementId: string;
}