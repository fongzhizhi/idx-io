// ============= 项目和相关类型 =============
// DESIGN: EDMDItem是IDX协作的核心概念，代表任何可协作对象
// REF: Section 4.1

import { EDMDObject, EDMDIdentifier, EDMName, EDMDUserSimpleProperty, EDMDTransformation, CartesianPoint, EDMDLengthProperty } from './common';
import { ItemType, GeometryType } from './enums';
import { ShapeType } from './geometry';

// ------------ 项目实例 ------------
/**
 * 项目实例，表示项目中某个具体实例
 */
export interface EDMDItemInstance extends EDMDObject {
  /** 引用的项目（项目类型） */
  Item: string;
  
  /** 实例名称 */
  InstanceName: EDMName;
  
  /** 变换矩阵（实例的位置和方向） */
  Transformation?: EDMDTransformation;
  
  /** Z轴偏移（相对于装配到的表面） */
  zOffset?: EDMDLengthProperty;
  
  /** 弯曲序列号（用于柔性板弯曲顺序） */
  bendSequenceNumber?: number;
  
  /** 用户自定义属性 */
  UserProperties?: EDMDUserSimpleProperty[];
  
  /** 用户区域层名称（仅用于UserArea类型） */
  InstanceUserAreaLayerName?: EDMName;
}

// ------------ 组件引脚类型 ------------
/**
 * 组件引脚定义
 */
export interface PackagePin {
  /** 引脚编号 */
  pinNumber: string;
  
  /** 是否为主要引脚（Pin 1） */
  primary: boolean;
  
  /** 引脚位置点 */
  Point: CartesianPoint;
  
  /** 引脚形状 */
  Shape: any | string;
}

// ------------ 3D模型引用类型 ------------
/**
 * 3D模型引用
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

// ------------ 项目基类 ------------
/**
 * EDMD项目基类
 */
export interface EDMDItem extends EDMDObject {
  /** 项目类型（单个/装配体） */
  ItemType: ItemType;
  
  /** 项目标识符 */
  Identifier?: EDMDIdentifier;
  
  /** 包名称（用于组件） */
  PackageName?: EDMName;
  
  /** 几何类型（IDXv4.0简化表示） */
  geometryType?: GeometryType;
  
  /** 参考名称（用于相对定位） */
  ReferenceName?: string;
  
  /** 装配到名称（用于相对层定位） */
  AssembleToName?: string;
  
  /** 基线标记（是否属于基线） */
  BaseLine?: boolean | EDMDUserSimpleProperty;
  
  /** 项目形状 */
  Shape?: ShapeType | string;
  
  /** 3D模型引用（仅用于组件） */
  EDMD3DModel?: EDMD3DModel | string;
  
  /** 组件引脚定义（仅用于组件） */
  PackagePins?: PackagePin[];
  
  /** 用户自定义属性 */
  UserProperties?: EDMDUserSimpleProperty[];
  
  /** 项目实例（仅当ItemType为ASSEMBLY时） */
  ItemInstances?: EDMDItemInstance[];
}

// ------------ 数据集体 ------------
/**
 * EDMD数据集体
 */
export interface EDMDDataSetBody {
  /** 项目集合 */
  Items: EDMDItem[];
  
  /** 形状集合 */
  Shapes?: ShapeType[];
  
  /** 3D模型集合 */
  Models3D?: EDMD3DModel[];
}
