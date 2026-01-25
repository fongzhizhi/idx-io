// ============= 项目和相关类型 =============
// DESIGN: EDMDItem是IDX协作的核心概念，代表任何可协作对象
// REF: Section 4.1
// NOTE: 项目可以是单个组件或装配体（包含多个子项目）

import { GeometryType } from '../../libs/geometry/Geometry2D';
import { EDMDObject, EDMDName, EDMDTransformation, EDMDLengthProperty, RoleOnItemInstance, EDMDIdentifier } from './base.types';

// ============= 项目定义 (Item single) =============

/**
 * 项目类型枚举
 *
 * @remarks
 * 定义EDMDItem的ItemType属性，标识项目是单个还是装配体
 * REF: Section 4.1
 */
export enum ItemType {
	/** 简单类型-项目定义 */
	SINGLE = 'single',
	/** 复杂类型-项目实例 */
	ASSEMBLY = 'assembly',
}

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
	ItemType: ItemType.SINGLE;
	/** 几何类型（简化方式使用，传统方式不使用） */
	geometryType?: GeometryType;
	/** 项目唯一标识符 */
	Identifier?: EDMDIdentifier;
	/** 包名称（用于可重用封装，如元件封装） */
	PackageName?: EDMDName;
	/** 参考名称（用于被其他项目引用，如层被Stackup引用） */
	ReferenceName?: string;
	/** 形状引用：简化方式引用ShapeElement，传统方式引用Third Item */
	Shape: string;
	/** 包引脚定义（用于封装引脚位置） */
	PackagePins?: EDMPackagePin[];
	/** 3D模型引用（可选） */
	EDMD3DModel?: string;
	/** 基线标记 */
	BaseLine?: boolean;
	/** 组装到名称（用于相对定位） */
	AssembleToName?: string;
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
	/** 是否为主引脚 */
	primary: boolean;
	/** 引脚位置点引用 */
	Point: string;
	/** 引脚形状引用 */
	Shape?: string;
}

/**
 * 3D模型定义
 *
 * @remarks
 * 用于引用外部3D模型文件
 * REF: Section 6.2.1.3
 */
export interface EDMD3DModel extends EDMDObject {
	/** 模型标识符（文件名或ID） */
	ModelIdentifier: string;
	/** 模型版本/配置 */
	ModelVersion?: string;
	/** 模型位置（相对路径） */
	ModelLocation?: string;
	/** MCAD格式 */
	MCADFormat: string;
	/** MCAD格式版本 */
	MCADFormatVersion?: string;
	/** 变换矩阵（用于对齐） */
	Transformation?: string;
	/** 变换参考（坐标系参考） */
	TransformationReference?: string;
}

// ============= 项目实例和项目装配 (Item assembly) =============

/**
 * 项目实例定义
 *
 * @remarks
 * 表示项目定义的一个具体实例，包含位置和变换信息
 * REF: Section 4.1.1.1
 */
export interface EDMDItemInstance extends EDMDObject {
	/** 引用的项目ID */
	Item: string;
	/** 实例名称 */
	InstanceName?: EDMDName;
	/** 变换矩阵 */
	Transformation?: EDMDTransformation;
	/** Z轴偏移（相对定位，IDXv4.0+） */
	zOffset?: EDMDLengthProperty;
	/** 弯曲序列号（用于柔性板弯曲顺序） */
	bendSequenceNumber?: number;
	/** 实例用户区域层名称（用于Other Outline映射到ECAD层） */
	InstanceUserAreaLayerName?: EDMDName;
}

/**
 * 项目装配（ItemType="assembly"）
 *
 * @remarks
 * 表示项目的一个或多个实例，包含几何类型和实例列表
 * REF: Section 4.1
 */
export interface EDMDItemAssembly extends EDMDObject {
	/** 项目类型，必须为 "assembly" */
	ItemType: ItemType.ASSEMBLY;
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
	BaseLine?: boolean;
	/** 角色和权限信息 */
	Roles?: RoleOnItemInstance[];
}
