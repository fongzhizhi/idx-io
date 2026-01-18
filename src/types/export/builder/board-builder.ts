// ============= 板子构建器类型定义 =============

import { GeometricElement, EDMDCurveSet2DElement, ShapeElementData, StratumElementData, CartesianPoint, EDMDCurveSet2D, GeometryType } from '../../core';
import { LayerStackupData } from '../exporter';

// ============= 基础类型 =============

/** Z轴参考点类型 */
export type ZAxisReference = 'BOTTOM' | 'CENTER' | 'TOP';

/** 板子类型联合类型 */
export type BoardGeometryType = GeometryType.BOARD_OUTLINE | GeometryType.BOARD_AREA_RIGID;

// ============= 输入数据接口 =============

/**
 * PCB板数据接口
 * 
 * @example
 * ```typescript
 * const board: BoardData = {
 *   id: 'BOARD_001',
 *   name: 'Main PCB',
 *   outline: {
 *     points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 30 }],
 *     thickness: 1.6,
 *     material: 'FR4'
 *   }
 * };
 * ```
 */
export interface BoardData {
  /** 板子唯一标识符 */
  id: string;
  
  /** 板子名称 */
  name: string;
  
  /** 板子轮廓定义 */
  outline: {
    /** 轮廓点列表（顺时针或逆时针） */
    points: Array<{ x: number; y: number }>;
    
    /** 板子厚度（mm） */
    thickness: number;
    
    /** 板子材质（可选） */
    material?: string;
    
    /** 表面处理（可选） */
    finish?: string;
  };
  
  /** 层叠结构（可选） */
  layerStackup?: LayerStackupData;
  
  /** 切口列表（可选） */
  cutouts?: Array<{
    id: string;
    shape: 'circle' | 'rectangle' | 'polygon';
    parameters: any;
    depth: number;
  }>;
  
  /** 加强筋区域列表（可选） */
  stiffeners?: Array<{
    id: string;
    name: string;
    shape: {
      points: Array<{ x: number; y: number }>;
    };
    thickness: number;
  }>;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

// ============= 内部处理接口 =============

/** 处理后的板子数据 */
export interface ProcessedBoardData {
  id: string;
  name: string;
  outline: {
    points: CartesianPoint[];
    thickness: number;
    material?: string;
  };
  layerStackup?: LayerStackupData;
  cutouts: Array<{
    id: string;
    shape: EDMDCurveSet2D;
    inverted: boolean;
  }>;
  stiffeners: Array<{
    id: string;
    name: string;
    shape: EDMDCurveSet2D;
  }>;
  customProperties?: Record<string, any>;
}

/** 几何数据返回类型 */
export interface GeometryData {
  geometricElements: GeometricElement[];
  curveSet2Ds: EDMDCurveSet2DElement[];
  shapeElements: ShapeElementData[];
  stratumElements: StratumElementData[];
  shapeElementId: string;
}

/** 圆形信息类型 */
export interface CircleInfo {
  centerX: number;
  centerY: number;
  radius: number;
}

// ============= 配置接口 =============

/** 板子构建配置 */
export interface BoardBuilderConfig {
  /** 是否使用简化表示法 */
  useSimplified: boolean;
  
  /** 默认单位 */
  defaultUnit: string;
  
  /** 创建者系统标识 */
  creatorSystem: string;
  
  /** 几何精度 */
  precision: number;
}

/** 板子构建上下文 */
export interface BoardBuilderContext {
  /** 警告列表 */
  warnings: string[];
  
  /** 错误列表 */
  errors: string[];
  
  /** 序列计数器 */
  sequenceCounters: Map<string, number>;
  
  /** 获取下一个序列号 */
  getNextSequence(type: string): number;
  
  /** 添加警告 */
  addWarning(code: string, message: string, itemId?: string): void;
  
  /** 添加错误 */
  addError(code: string, message: string, itemId?: string): void;
  
  /** 生成ID */
  generateId(type: string, identifier?: string): string;
}