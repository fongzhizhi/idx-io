// ============= 项目和相关类型 =============
// DESIGN: EDMDItem是IDX协作的核心概念，代表任何可协作对象
// REF: Section 4.1
// NOTE: 项目可以是单个组件或装配体（包含多个子项目）

import { EDMDObject, EDMName, EDMDTransformation, EDMDLengthProperty, EDMDUserSimpleProperty, EDMDIdentifier, CartesianPoint, RoleOnItemInstance } from './base.types';
import { GeometryType } from './enums';

// ============= 项目定义 (Item single) =============

/**
 * 项目定义（ItemType="single"）
 * 
 * @remarks
 * 表示项目的几何定义，可被多个实例引用
 * REF: Section 4.1
 * XML: <foundation:Item>
 */
export interface EDMDItemSingle extends EDMDObject {
    /** 项目类型，必须为 "single" */
    ItemType: 'single';
    /** 项目唯一标识符 */
    Identifier?: EDMDIdentifier;
    /** 包名称（用于可重用封装，如元件封装） */
    PackageName?: EDMName;
    /** 形状引用：在简化方式中引用 ShapeElement，传统方式中引用 Stratum 等 */
    Shape: string;
    /** 包引脚定义（用于元件引脚位置） */
    PackagePins?: EDMPackagePin[];
    /** 3D模型引用（可选） */
    EDMD3DModel?: string;
    /** 基线标记 */
    BaseLine?: { Value: boolean };
    /** 用户自定义属性 */
    UserProperties?: EDMDUserSimpleProperty[];
}

/**
 * 包引脚定义
 * 
 * @remarks
 * 用于定义元件引脚的位置和形状
 * REF: Section 6.2.1.5
 */
export interface EDMPackagePin {
    /** 引脚编号 */
    pinNumber: string;
    /** 是否为主引脚（引脚1） */
    primary: boolean;
    /** 引脚位置点，引用 CartesianPoint 的 id */
    Point: string;
    /** 引脚形状引用 */
    Shape?: string;
}

// ============= 项目实例 (Item assembly) =============

/**
 * 项目实例定义
 * 
 * @remarks
 * 表示项目定义的一个具体实例，包含位置和变换信息
 * REF: Section 4.1.1.1
 */
export interface EDMDItemInstance extends EDMDObject {
    /** 引用的项目定义（Item single）id */
    Item: string;
    /** 实例名称 */
    InstanceName: EDMName;
    /** 变换矩阵 */
    Transformation?: EDMDTransformation;
    /** Z轴偏移（相对定位，IDXv4.0+） */
    zOffset?: EDMDLengthProperty;
    /** 弯曲序列号（用于柔性板弯曲顺序） */
    bendSequenceNumber?: number;
    /** 用户自定义属性 */
    UserProperties?: EDMDUserSimpleProperty[];
    /** 实例用户区域层名称（用于Other Outline映射到ECAD层） */
    InstanceUserAreaLayerName?: EDMName;
}

/**
 * 项目实例集合（ItemType="assembly"）
 * 
 * @remarks
 * 表示项目的一个或多个实例，包含几何类型和实例列表
 * REF: Section 4.1
 */
export interface EDMDItemAssembly extends EDMDObject {
	/** 项目类型，必须为 "assembly" */
	ItemType: 'assembly';
	/** 几何类型（简化方式的关键属性） */
	geometryType?: GeometryType;
	/** 项目唯一标识符 */
	Identifier?: EDMDIdentifier;
	/** 项目实例列表 */
	ItemInstances: EDMDItemInstance[];
	/** 装配到名称（用于相对层/表面定位） */
	AssembleToName?: string;
	/** 参考名称（便于其他项目引用） */
	ReferenceName?: string;
	/** 基线标记 */
	BaseLine?: { Value: boolean };
	/** 用户自定义属性 */
	UserProperties?: EDMDUserSimpleProperty[];
	/** 角色和权限信息 */
	Roles?: RoleOnItemInstance[];
}