// ============= 物理层和层堆叠类型 =============

import { EDMDGeometryType } from './item.types';

/**
 * 层技术类型枚举
 */
export type LayerTechnologyType =
	| EDMDGeometryType.LAYER_SILKSCREEN
	| EDMDGeometryType.LAYER_OTHERSIGNAL
	| EDMDGeometryType.LAYER_POWERGROUND
	| EDMDGeometryType.LAYER_SOLDERMASK
	| EDMDGeometryType.LAYER_DIELECTRIC
	| EDMDGeometryType.LAYER_SOLDERPASTE
	| EDMDGeometryType.LAYER_GLUE
	| EDMDGeometryType.LAYER_LANDSONLY;

/**
 * 传统层技术类型枚举
 */
export enum TraditionalLayerTechnologyType {
	/** 信号层 */
	SIGNAL = 'LAYER_OTHERSIGNAL',
	/** 电源/地层 */
	POWER_GROUND = 'LAYER_POWERGROUND',
	/** 阻焊层 */
	SOLDERMASK = 'LAYER_SOLDERMASK',
	/** 丝印层 */
	SILKSCREEN = 'LAYER_SILKSCREEN',
	/** 介质层 */
	DIELECTRIC = 'LAYER_DIELECTRIC',
	/** 锡膏层 */
	SOLDERPASTE = 'LAYER_SOLDERPASTE',
	/** 胶层 */
	GLUE = 'LAYER_GLUE',
	/** 仅焊盘层 */
	LANDS_ONLY = 'LAYER_LANDSONLY',
}

/**
 * 层定义接口（简化方式）
 */
export interface LayerDefinition {
	/** 层ID */
	id: string;
	/** 层类型 */
	layerType: LayerTechnologyType;
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
}

/**
 * 层堆叠中的层定义
 */
export interface LayerStackupLayer {
	/** 层引用名称 */
	layerReferenceName: string;
	/** 在此堆叠中的下边界 */
	lowerBound: number;
	/** 在此堆叠中的上边界 */
	upperBound: number;
	/** 材料（可覆盖层定义） */
	material?: string;
	/** 层用途（可覆盖层定义） */
	layerPurpose?: string;
}
