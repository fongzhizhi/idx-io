// ============= 层构建器类型定义 =============
// DESIGN: 支持PCB层的类型定义和层叠结构
// REF: IDXv4.5规范第6.1节，层和地层定义
// BUSINESS: 层是PCB的基础结构，需要准确的类型定义

import { 
  StandardGeometryType, LayerPurpose, StratumType, StratumSurfaceDesignation 
} from '../core';
import { LayerStackupData } from '../data-models';

// ============= 基础类型 =============

/** 层几何类型联合类型 */
export type LayerGeometryType = 
  | StandardGeometryType.LAYER_SOLDERMASK
  | StandardGeometryType.LAYER_SOLDERPASTE
  | StandardGeometryType.LAYER_SILKSCREEN
  | StandardGeometryType.LAYER_GENERIC
  | StandardGeometryType.LAYER_GLUE
  | StandardGeometryType.LAYER_GLUEMASK
  | StandardGeometryType.LAYER_PASTEMASK
  | StandardGeometryType.LAYER_OTHERSIGNAL
  | StandardGeometryType.LAYER_LANDSONLY
  | StandardGeometryType.LAYER_POWERGROUND
  | StandardGeometryType.LAYER_EMBEDDED_CAP_DIELECTRIC
  | StandardGeometryType.LAYER_EMBEDDED_RESISTOR
  | StandardGeometryType.LAYER_DIELECTRIC
  | StandardGeometryType.LAYER_STACKUP;

/** 层类型枚举 */
export enum LayerType {
  SIGNAL = 'SIGNAL',
  PLANE = 'PLANE',
  SOLDERMASK = 'SOLDERMASK',
  SILKSCREEN = 'SILKSCREEN',
  DIELECTRIC = 'DIELECTRIC',
  OTHERSIGNAL = 'OTHERSIGNAL'
}

// ============= 输入数据接口 =============

/**
 * 层数据接口
 * 
 * @remarks
 * 描述PCB层的物理和电气属性
 * BUSINESS: 必须包含ID、名称、类型和厚度信息
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 信号层定义
 * const layerData: LayerData = {
 *   id: 'TOP',
 *   name: '顶层信号层',
 *   type: LayerType.SIGNAL,
 *   thickness: 0.035,
 *   material: 'Copper',
 *   copperWeight: 1
 * };
 * ```
 */
export interface LayerData {
  /** 层唯一标识符 */
  id: string;
  
  /** 层名称 */
  name: string;
  
  /** 层类型 */
  type: LayerType;
  
  /** 层厚度（mm） */
  thickness: number;
  
  /** 层材料（可选） */
  material?: string;
  
  /** 铜重量（oz/ft²，仅导电层） */
  copperWeight?: number;
  
  /** 介电常数（仅介质层） */
  dielectricConstant?: number;
  
  /** 损耗角正切（仅介质层） */
  lossTangent?: number;
  
  /** 表面处理（可选） */
  surfaceFinish?: string;
  
  /** 层颜色（可选） */
  color?: string;
  
  /** 是否可见 */
  visible?: boolean;
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

/** 层叠结构输入 */
export interface LayerStackupInput {
  /** 层数据数组 */
  layers: LayerData[];
  /** 可选的层叠结构定义 */
  layerStackup?: LayerStackupData;
}

// ============= 内部处理接口 =============

/** 处理后的层数据 */
export interface ProcessedLayerData {
  id: string;
  name: string;
  type: LayerType;
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
  lossTangent?: number;
  surfaceFinish?: string;
  color?: string;
  visible?: boolean;
  properties?: Record<string, any>;
  
  // 处理后的属性
  processedId: string;
  normalizedType: LayerGeometryType;
  layerPurpose: LayerPurpose;
}

/** 处理后的层叠结构数据 */
export interface ProcessedLayerStackupData {
  id: string;
  name: string;
  totalThickness: number;
  layers: ProcessedLayerStackupEntry[];
  processedId: string;
  layerZPositions: Map<string, number>;
}

/** 处理后的层叠结构条目 */
export interface ProcessedLayerStackupEntry {
  layerId: string;
  position: number;
  thickness: number;
  material?: string;
  zPosition: number;
  layerExists: boolean;
}

/** 层分类类型 */
export type LayerCategory = 'CONDUCTIVE' | 'PROTECTIVE' | 'MARKING' | 'INSULATING' | 'OTHER';
export interface LayerStackupInput {
  /** 层数据数组 */
  layers: LayerData[];
  /** 可选的层叠结构定义 */
  layerStackup?: LayerStackupData;
}

// ============= 内部处理接口 =============

/** 处理后的层数据 */
export interface ProcessedLayerData {
  id: string;
  name: string;
  type: LayerType;
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
  lossTangent?: number;
  surfaceFinish?: string;
  color?: string;
  visible?: boolean;
  properties?: Record<string, any>;
  
  // 处理后的属性
  processedId: string;
  normalizedType: LayerGeometryType;
  layerPurpose: LayerPurpose;
}

/** 处理后的层叠结构数据 */
export interface ProcessedLayerStackupData {
  id: string;
  name: string;
  totalThickness: number;
  layers: ProcessedLayerStackupEntry[];
  processedId: string;
  layerZPositions: Map<string, number>;
}

/** 处理后的层叠结构条目 */
export interface ProcessedLayerStackupEntry {
  layerId: string;
  position: number;
  thickness: number;
  material?: string;
  zPosition: number;
  layerExists: boolean;
}

/** 层分类类型 */
export type LayerCategory = 'CONDUCTIVE' | 'PROTECTIVE' | 'MARKING' | 'INSULATING' | 'OTHER';