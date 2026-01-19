// ============= 层和层堆叠类型 =============
// DESIGN: IDX支持复杂的多层板表示，包括柔性板和刚柔结合板
// REF: Section 6.1.2
// NOTE: 层系统是高级PCB设计的核心

import { EDMDLengthProperty, EDMDUserSimpleProperty, CartesianPoint3D } from './common';
import { LayerPurpose, FunctionalItemShapeType } from './enums';
import { EDMDShapeElement } from './geometry';

// ------------ 物理层定义 ------------
/**
 * 物理层定义
 *
 * @remarks
 * 表示PCB中的一个物理材料层
 * REF: Section 6.1.2.1
 */
export interface PhysicalLayer {
	/** 层标识符 */
	id: string;

	/** 层名称 */
	name: string;

	/** 层类型/目的 */
	layerType: LayerPurpose;

	/** 层材料 */
	material?: string;

	/** 层厚度 */
	thickness: EDMDLengthProperty;

	/** 介电常数（仅介质层） */
	dielectricConstant?: number;

	/** 铜厚度（仅导电层） */
	copperWeight?: number; // 单位: oz/ft²

	/** 表面处理 */
	surfaceFinish?: string;

	/** 可选的附加属性 */
	properties?: EDMDUserSimpleProperty[];
}

// ------------ 层堆叠定义 ------------
/**
 * 层堆叠条目
 *
 * @remarks
 * 层堆叠中的一个层实例
 */
export interface LayerStackEntry {
	/** 层实例ID */
	id: string;

	/** 引用的层定义 */
	layerRef: string;

	/** 在堆叠中的位置 */
	position: number;

	/** Z轴下界（绝对或相对值） */
	lowerBound: EDMDLengthProperty;

	/** Z轴上界（绝对或相对值） */
	upperBound: EDMDLengthProperty;

	/** 层方向（正常/镜像） */
	orientation: 'normal' | 'mirrored';
}

/**
 * 层堆叠定义
 *
 * @remarks
 * 定义PCB的层堆叠顺序和厚度
 * REF: Section 6.1.2.2
 */
export interface LayerStackup {
	/** 堆叠标识符 */
	id: string;

	/** 堆叠名称 */
	name: string;

	/** 堆叠描述 */
	description?: string;

	/** 堆叠条目列表（从下到上） */
	layers: LayerStackEntry[];

	/** 总厚度 */
	totalThickness: EDMDLengthProperty;

	/** 堆叠类型 */
	type: 'rigid' | 'flexible' | 'rigid-flex';
}

// ------------ 层区域定义 ------------
/**
 * 层区域类型
 *
 * @remarks
 * 定义PCB上不同区域的层堆叠配置
 * REF: Section 6.1.2.3
 */
export interface LayerZone {
	/** 区域标识符 */
	id: string;

	/** 区域名称 */
	name: string;

	/** 区域类型 */
	zoneType: FunctionalItemShapeType;

	/** 几何形状 */
	shape: EDMDShapeElement;

	/** 引用的层堆叠 */
	stackupRef: string;

	/** 区域优先级（用于重叠区域） */
	priority?: number;

	/** 附加属性 */
	properties?: EDMDUserSimpleProperty[];
}

// ------------ 完整层系统定义 ------------
/**
 * 完整PCB层系统
 *
 * @remarks
 * 包含所有层、堆叠和区域的定义
 */
export interface LayerSystem {
	/** 物理层定义集合 */
	layers: Record<string, PhysicalLayer>;

	/** 层堆叠定义集合 */
	stackups: Record<string, LayerStackup>;

	/** 层区域定义集合 */
	zones: LayerZone[];

	/** 默认层堆叠（用于简单板） */
	defaultStackup?: string;
}

// ------------ 层相关工具类型 ------------
/**
 * 层计算上下文
 *
 * @remarks
 * 用于计算层相关几何的位置和厚度
 */
export interface LayerContext {
	/** 基准面（z=0的面） */
	referencePlane: 'BOTTOM' | 'TOP' | 'MIDDLE';

	/** 坐标系方向 */
	coordinateSystem: 'right-handed' | 'left-handed';

	/** 是否使用相对定位 */
	useRelativePositioning: boolean;
}

/**
 * 层位置计算器
 *
 * @remarks
 * 根据层堆叠计算特定层的Z轴位置
 */
export interface LayerPositionCalculator {
	/** 计算层的绝对Z位置 */
	calculateAbsolutePosition(stackupId: string, layerPosition: number, side: 'top' | 'bottom'): number;

	/** 计算层厚度 */
	calculateLayerThickness(stackupId: string, layerId: string): number;

	/** 计算点到层表面的距离 */
	calculateDistanceToLayer(point: CartesianPoint3D, stackupId: string, layerId: string, side: 'top' | 'bottom'): number;
}
