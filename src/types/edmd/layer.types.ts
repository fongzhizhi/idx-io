// ============= 物理层和层堆叠类型 =============

import { EDMDIdentifier } from './base.types';
import { EDMDGeometryType } from './item.types';

/**
 * LayerType枚举用于UserProperty [LayerType]的值。
 * 根据IDXv4.5指南第51-52页，这些是用户属性LayerType的可能取值。
 * 注意：这些值用于UserProperty，而geometryType使用不同的值（如LAYER_SOLDERMASK等）。
 */
export enum EDMDLayerType {
	// 从表格中直接获取的值
	SOLDERMASK = 'SolderMask',
	SOLDERPASTE = 'SolderPaste',
	SILKSCREEN = 'SilkScreen',
	GENERICLAYER = 'GenericLayer',
	GLUE = 'Glue',
	GLUEMASK = 'GlueMask',
	PASTEMASK = 'PasteMask',
	OTHERSIGNAL = 'OtherSignal',
	LANDSONLY = 'LandsOnly',
	POWERGROUND = 'PowerOrGround',
	EMBEDDED_CAPACITOR_DIELECTRIC = 'EmbeddedPassiveCapacitorDielectric',
	EMBEDDED_RESISTOR = 'EmbeddedPassiveResistor',
	DIELECTRIC = 'Dielectric',
	// 从示例中推断出的值（未在表格中但使用）
	SIGNAL = 'Signal',
}

/**
 * 层定义接口（简化方式）
 */
export interface LayerDefinition {
	/** 层ID */
	id: string;
	/** 层类型（用于geometryType属性） */
	layerType: EDMDGeometryType;
	/** 层名称 */
	name: string;
	/** 层描述 */
	description?: string;
	/** 参考名称（被堆叠引用） */
	referenceName: string;
	/** Z轴下边界 */
	lowerBound: number;
	/** Z轴上边界 */
	upperBound: number;
	/** 材料属性 */
	material?: string;
	/** 厚度 */
	thickness?: number;
	/** 介电常数（介质层） */
	dielectricConstant?: number;
	/** 层标识符 */
	identifier?: EDMDIdentifier;
}

/**
 * 层堆叠定义接口
 */
export interface LayerStackupDefinition {
	/** 堆叠ID */
	id: string;
	/** 堆叠名称 */
	name: string;
	/** 堆叠描述 */
	description?: string;
	/** 参考名称（被板区域引用） */
	referenceName: string;
	/** 层列表（按从下到上的顺序） */
	layers: LayerStackupLayer[];
	/** 总厚度 */
	totalThickness: number;
	/** 层堆叠标识符 */
	identifier?: EDMDIdentifier;
}

/**
 * 层堆叠中的层定义
 */
export interface LayerStackupLayer {
	/** 引用层ID */
	layerId: string;
	/** 层引用名称（用于显示） */
	layerReferenceName: string;
	/** 层类型（用于实例中的LayerType属性，使用简单类型名） */
	layerType?: string;
	/** 在此堆叠中的下边界 */
	lowerBound: number;
	/** 在此堆叠中的上边界 */
	upperBound: number;
	/** 材料（可覆盖层定义） */
	material?: string;
	/** 层用途（可覆盖层定义） */
	layerPurpose?: string;
}
