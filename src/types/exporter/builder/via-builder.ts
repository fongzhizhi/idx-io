// ============= 过孔构建器类型定义 =============
// DESIGN: 支持多种过孔类型的类型定义
// REF: IDXv4.5规范第6.3节，表5支持的孔类型
// BUSINESS: 过孔是PCB的关键互连元素，必须准确表示层间连接

import { GeometryType, InterStratumFeatureType } from "../../core";


// ============= 基础类型 =============

/** 过孔几何类型联合类型 */
export type ViaGeometryType = 
  | GeometryType.HOLE_PLATED
  | GeometryType.HOLE_NON_PLATED
  | GeometryType.HOLE_PLATED_MILLED
  | GeometryType.HOLE_NONPLATED_MILLED
  | GeometryType.VIA
  | GeometryType.FILLED_VIA;

/** 过孔类型枚举 */
export type ViaType = 'plated' | 'non-plated' | 'filled' | 'micro';

// ============= 输入数据接口 =============

/**
 * 过孔数据接口
 * 
 * @remarks
 * 描述PCB过孔的几何和电气特性
 * BUSINESS: 必须指定孔类型、直径和连接的层
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 标准镀孔
 * const viaData: ViaData = {
 *   id: 'VIA1',
 *   name: '过孔1',
 *   position: { x: 50, y: 30 },
 *   diameter: 0.3,
 *   viaType: 'plated',
 *   startLayer: 'TOP',
 *   endLayer: 'BOTTOM',
 *   properties: {
 *     netName: 'GND',
 *     padSize: 0.6
 *   }
 * };
 * ```
 */
export interface ViaData {
  /** 过孔唯一标识符 */
  id: string;
  
  /** 过孔名称（可选） */
  name?: string;
  
  /** 过孔位置 */
  position: {
    x: number;
    y: number;
  };
  
  /** 过孔直径（mm） */
  diameter: number;
  
  /** 过孔类型 */
  viaType: ViaType;
  
  /** 起始层 */
  startLayer: string;
  
  /** 结束层 */
  endLayer: string;
  
  /** 焊盘直径（可选，如果不同于孔径） */
  padDiameter?: number;
  
  /** 反焊盘直径（可选） */
  antiPadDiameter?: number;
  
  /** 所属网络（可选） */
  netName?: string;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

// ============= 内部处理接口 =============

/** 处理后的过孔数据 */
export interface ProcessedViaData {
  id: string;
  name: string;
  position: { x: number; y: number };
  diameter: number;
  viaType: ViaType;
  geometryType: ViaGeometryType;
  interStratumFeatureType: InterStratumFeatureType;
  lowerBound: number;  // Z轴下界
  upperBound: number;  // Z轴上界
  padDiameter?: number;
  antiPadDiameter?: number;
  netName?: string;
  properties?: Record<string, any>;
}

/** 过孔几何数据 */
export interface ViaGeometryData {
  geometricElements: any[];
  curveSet2Ds: any[];
  shapeElements: any[];
  shapeElementId: string;
}

/** 过孔层连接信息 */
export interface ViaLayerConnection {
  startLayer: string;
  endLayer: string;
  connectedLayers: string[];
  layerSpan: {
    startZ: number;
    endZ: number;
    totalThickness: number;
  };
}