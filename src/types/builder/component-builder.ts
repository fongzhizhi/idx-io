// ============= 组件构建器类型定义 =============
// DESIGN: 支持电气和机械组件的类型定义
// REF: IDXv4.5规范第6.2节，组件类型和属性
// BUSINESS: 组件是PCB的核心元素，需要准确的类型定义

import { 
  CartesianPoint, EDMDTransformation2D, EDMDTransformation3D, 
  StandardGeometryType, AssemblyComponentType 
} from '../core';

// ============= 基础类型 =============

/** 组件类型联合类型 */
export type ComponentGeometryType = StandardGeometryType.COMPONENT | StandardGeometryType.COMPONENT_MECHANICAL;

/** 组件层位置类型 */
export type ComponentLayer = 'TOP' | 'BOTTOM' | 'INNER';

// ============= 输入数据接口 =============

/**
 * 组件数据接口
 * 
 * @remarks
 * 描述PCB组件的几何、电气和位置信息
 * BUSINESS: 必须包含位号、封装名称和位置信息
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 标准电容组件
 * const componentData: ComponentData = {
 *   refDes: 'C1',
 *   partNumber: 'CAP-0805-1uF',
 *   packageName: '0805',
 *   position: { x: 30, y: 30, z: 1.6, rotation: 0 },
 *   dimensions: { width: 2.0, height: 1.2, thickness: 0.8 },
 *   layer: 'TOP',
 *   electrical: {
 *     capacitance: 0.000001,
 *     tolerance: 10
 *   }
 * };
 * ```
 */
export interface ComponentData {
  /** 组件位号（如C1、R1、U1等） */
  refDes: string;
  
  /** 组件型号/料号 */
  partNumber: string;
  
  /** 封装名称（如0805、SOIC-8等） */
  packageName: string;
  
  /** 组件位置 */
  position: {
    x: number;
    y: number;
    z?: number; // Z轴位置，可选
    rotation: number; // 旋转角度（度）
  };
  
  /** 组件尺寸 */
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  
  /** 所在层 */
  layer: ComponentLayer;
  
  /** 是否为机械组件 */
  isMechanical?: boolean;
  
  /** 电气属性（可选） */
  electrical?: ComponentElectricalProperties;
  
  /** 热属性（可选） */
  thermal?: ComponentThermalProperties;
  
  /** 3D模型信息（可选） */
  model3D?: Component3DModel;
  
  /** 引脚定义（可选） */
  pins?: ComponentPin[];
  
  /** 附加属性 */
  properties?: Record<string, any>;
}

/** 组件电气属性 */
export interface ComponentElectricalProperties {
  /** 电容值（法拉） */
  capacitance?: number;
  /** 电阻值（欧姆） */
  resistance?: number;
  /** 电感值（亨利） */
  inductance?: number;
  /** 容差（百分比） */
  tolerance?: number;
  /** 额定电压（伏特） */
  ratedVoltage?: number;
  /** 额定电流（安培） */
  ratedCurrent?: number;
}

/** 组件热属性 */
export interface ComponentThermalProperties {
  /** 工作功率（瓦特） */
  powerRating?: number;
  /** 最大功率（瓦特） */
  maxPower?: number;
  /** 热导率（W/m·K） */
  thermalConductivity?: number;
  /** 结到板热阻（°C/W） */
  junctionToBoardResistance?: number;
  /** 结到壳热阻（°C/W） */
  junctionToCaseResistance?: number;
}

/** 组件3D模型 */
export interface Component3DModel {
  /** 模型文件路径或标识符 */
  path: string;
  /** 模型格式（STEP、STL、SLDPRT等） */
  format: string;
  /** 模型版本（可选） */
  version?: string;
  /** 变换偏移（用于对齐） */
  offset?: { 
    x: number; 
    y: number; 
    z: number; 
    rotation: number; 
  };
}

/** 组件引脚 */
export interface ComponentPin {
  number: string;
  isPrimary: boolean; // 是否为主要引脚（Pin 1）
  position: { x: number; y: number };
  shape?: any; // 引脚形状（可选）
}

// ============= 内部处理接口 =============

/** 处理后的组件数据 */
export interface ProcessedComponentData {
  refDes: string;
  partNumber: string;
  packageName: string;
  position: {
    x: number;
    y: number;
    z: number;
    rotation: number;
  };
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  layer: ComponentLayer;
  isMechanical: boolean;
  geometryType: ComponentGeometryType;
  transformation: EDMDTransformation2D | EDMDTransformation3D;
  electrical?: ComponentElectricalProperties;
  thermal?: ComponentThermalProperties;
  model3D?: Component3DModel;
  pins?: ComponentPin[];
  properties?: Record<string, any>;
}

/** 组件几何数据 */
export interface ComponentGeometryData {
  geometricElements: any[];
  curveSet2Ds: any[];
  shapeElements: any[];
  shapeElementId: string;
}