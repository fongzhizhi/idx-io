import { EDMDIdentifier, EDMDObject, EDMDName, EDMDCartesianPoint, GlobalUnit } from './base.types';
import { EDMDGeometry, EDMDCurveSet2D } from './geometry.types';
import { EDMDItemSingle, EDMDItemAssembly } from './item.types';
import { LayerDefinition, LayerStackupDefinition } from './layer.types';
import { EDMDModel3D } from './model3d.types';
import { IDXComputationalTag } from './namespace.types';
import { EDMDShapeElement, EDMDStratum, EDMDThirdItem } from './shape-element.types';

// ============= IDX消息类型 =============
// DESIGN: IDX协议支持三种消息类型，所有消息都基于EDMDDataSet
// REF: Section 3, 5.1-5.5
// NOTE: 消息类型决定了数据集的用途和解释方式

/**
 * EDMD数据集根元素
 *
 * @remarks
 * IDX文件的根元素，包含头部、数据体和处理指令
 * REF: Section 4
 * XML: <foundation:EDMDDataSet>
 */
export interface EDMDDataSet {
	/** 头部信息 */
	Header: EDMDHeader;
	/** 数据体，包含所有设计数据 */
	Body: EDMDDataSetBody;
	/** 处理指令 */
	ProcessInstruction: EDMDProcessInstruction;
}

// ============= HEADER =============
/**
 * EDMD数据集头部信息
 *
 * @remarks
 * 包含创建者信息、时间戳和全局设置
 * REF: Section 5.1
 */
export interface EDMDHeader {
	/** 数据集描述 */
	Description?: string;
	/** 创建者姓名 */
	CreatorName?: string;
	/** 创建者公司 */
	CreatorCompany?: string;
	/** 创建者系统（ECAD/MCAD软件名称） */
	CreatorSystem?: string;
	/** 后处理器名称 */
	PostProcessor?: string;
	/** 后处理器版本 */
	PostProcessorVersion?: string;
	/** 创建者用户ID */
	Creator?: string;
	/** 全局长度单位 */
	GlobalUnitLength: GlobalUnit;
	/** 创建日期时间 (ISO 8601) */
	CreationDateTime: string;
	/** 最后修改日期时间 (ISO 8601) */
	ModifiedDateTime: string;
}

// ============= Boay =============
/**
 * 数据体，包含所有设计数据
 * @description 按层级划分和统计数据
 */
export type EDMDDataSetBody = Partial<{
	// ------------ 几何相关 ------------
	/** 点集合 */
	Points: EDMDCartesianPoint[];
	/** 几何元素集合 */
	Geometries: EDMDGeometry[];
	/** 2D曲线集合 */
	CurveSets: EDMDCurveSet2D[];

	// ------------ 形状相关 ------------
	/** 形状元素集合 */
	ShapeElements: EDMDShapeElement[];
	/** 传统方式Third Item类型集合 */
	Strata: EDMDThirdItem[];

	// ------------ 引用相关 ------------
	/** 物理层集合 */
	Layers: LayerDefinition[];
	/** 层堆叠集合 */
	LayersStackup: LayerStackupDefinition[];
	/** 3D模型引用集合 */
	Models3D: EDMDModel3D[];

	// ------------ 项目Item相关 ------------
	/** 项目定义集合（Item single） */
	ItemsSingle: EDMDItemSingle[];
	/** 项目实例集合（Item assembly） */
	ItemsAssembly: EDMDItemAssembly[];

	// ------------ 历史记录相关 ------------
	/** 历史记录集合 */
	Histories: EDMDHistory[];
}>;

/**
 * 历史记录
 *
 * @remarks
 * 可选的事务历史记录
 * REF: Section 5.4
 */
export interface EDMDHistory extends EDMDObject {
	/** 历史记录条目 */
	HistoryEntries?: EDMDHistoryEntry[];
	/** 主题（引用的事务或变更） */
	Subject?: string;
}

/**
 * 历史记录条目
 */
export interface EDMDHistoryEntry {
	/** 创建者标识符 */
	Creator: string;
	/** 文本描述 */
	Text: string;
	/** 创建日期时间 */
	CreationDateTime: string;
	/** 系统范围 */
	SystemScope: string;
}

// ============= ProcessInstruction =============

/**
 * 处理指令类型
 *
 * @remarks
 * 定义IDX消息的类型和行为
 * REF: Section 5.1, 5.2
 */
export type EDMDProcessInstruction =
	| EDMDProcessInstructionSendInformation
	| EDMDProcessInstructionSendChanges
	| EDMDProcessInstructionRequestForInformation;

/** 指令类型 */
export type EDMDProcessInstructionType =
	| IDXComputationalTag.SendInformation
	| IDXComputationalTag.SendChanges
	| IDXComputationalTag.RequestForInformation;

/** 指令基础 */
export interface EDMDProcessInstructionBase {
	/** 指令类型 */
	type: EDMDProcessInstructionType;
	/** 执行者（发送者） */
	Actor?: string;
}

/**
 * 发送信息指令（基线发送）
 *
 * @remarks
 * 用于发送初始基线或重新基线
 * REF: Section 5.1
 */
export interface EDMDProcessInstructionSendInformation extends EDMDProcessInstructionBase {
	type: IDXComputationalTag.SendInformation;
	/** 指令描述 */
	Description?: string;
}

/**
 * 发送变更指令（变更提议或响应）
 *
 * @remarks
 * 用于发送设计变更或响应变更
 * REF: Section 5.2
 */
export interface EDMDProcessInstructionSendChanges extends EDMDProcessInstructionBase {
	type: IDXComputationalTag.SendChanges;
	/** 变更列表 */
	Changes?: EDMDTransaction[];
}

/**
 * 请求信息指令
 *
 * @remarks
 * 用于请求项目状态信息，当前较少使用
 * REF: Section 3 Introduction
 */
export interface EDMDProcessInstructionRequestForInformation extends EDMDProcessInstructionBase {
	type: IDXComputationalTag.RequestForInformation;
	/** 请求的项目标识符 */
	RequestedItems?: EDMDIdentifier[];
}

/**
 * 事务变更记录
 *
 * @remarks
 * 记录一个或多个设计变更
 * REF: Section 5.2.1
 */
export interface EDMDTransaction extends EDMDObject {
	/** 变更列表 */
	Changes: EDMDChange[];
	/** 事务描述 */
	Description?: string;
}

/**
 * 单个变更定义
 *
 * @remarks
 * 描述一个具体的项目变更
 * REF: Section 5.2.1, 5.2.2
 */
export interface EDMDChange extends EDMDObject {
	/** 执行者 */
	Actor?: string;
	/** 新项目标识符（用于添加、修改、替换操作） */
	NewItem?: EDMDIdentifier;
	/** 前驱项目标识符（用于修改、替换操作） */
	PredecessorItem?: EDMDIdentifier;

	/** 变更类型 */
	ChangeType: EDMDChangeType;

	/** 接受标记（用于响应） */
	Accept?: {
		/** 接受/拒绝值 */
		Value: boolean;
		/** 接受/拒绝的理由 */
		Reason?: string;
		/** 可选：接受者评论 */
		Comment?: string;
	};
}

/** 变更类型枚举 */
export enum EDMDChangeType {
	/** 添加新项目 */
	ADD = 'add',
	/** 删除项目 */
	REMOVE = 'remove',
	/** 移动项目 */
	MOVE = 'move',
	/** 修改项目属性或形状 */
	MODIFY = 'modify',
	/** 替换项目 */
	REPLACE = 'replace',
}
