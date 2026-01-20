import { EDMDIdentifier, EDMDObject, EDMName, EDMDTransformation, EDMDHeader, CartesianPoint, EDMDStratumTechnology } from './base.types';
import { EDMDGeometry, EDMDCurveSet2D } from './geometry.types';
import { EDMDItemSingle, EDMDItemAssembly } from './items.types';
import { IDXComputationalTag } from './namespace.types';
import { EDMDShapeElement, EDMDStratum } from './shape-element.types';

// ============= IDX消息类型 =============
// DESIGN: IDX协议支持三种消息类型，所有消息都基于EDMDDataSet
// REF: Section 3, 5.1-5.5
// NOTE: 消息类型决定了数据集的用途和解释方式

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
 */
export interface EDMDChange {
	/** 执行者 */
	Actor?: string;
	/** 新项目标识符 */
	NewItem?: EDMDIdentifier;
	/** 前驱项目标识符 */
	PredecessorItem?: EDMDIdentifier;
	/** 接受标记（用于响应） */
	Accept?: { Value: boolean };
	/** 删除的实例名称（用于删除操作） */
	DeletedInstanceName?: EDMName;
}

/**
 * 3D模型引用
 *
 * @remarks
 * 用于引用外部3D模型文件
 * REF: Section 6.2.1.3
 */
export interface EDMDModel3D extends EDMDObject {
	/** 模型标识符（文件名或ID） */
	ModelIdentifier: string;
	/** 模型版本/配置 */
	ModelVersion?: string;
	/** 模型位置（相对路径） */
	ModelLocation?: string;
	/** MCAD文件格式 */
	MCADFormat: 'SolidWorks' | 'NX' | 'Catia' | 'STEP' | 'STL' | 'Inventor' | 'Fusion' | 'SolidEdge';
	/** MCAD格式版本 */
	MCADFormatVersion?: string;
	/** 变换矩阵（用于对齐） */
	Transformation?: EDMDTransformation;
	/** 变换参考（坐标系名称） */
	TransformationReference?: string;
}

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
	Body: {
		/** 点集合 */
		Points?: CartesianPoint[];
		/** 几何元素集合 */
		Geometries?: EDMDGeometry[];
		/** 2D曲线集合 */
		CurveSets?: EDMDCurveSet2D[];
		/** 形状元素集合 */
		ShapeElements?: EDMDShapeElement[];
		/** 层技术定义集合 */
		StratumTechnologies?: EDMDStratumTechnology[];
		/** 层定义集合（传统方式） */
		Strata?: EDMDStratum[];
		/** 3D模型引用集合 */
		Models3D?: EDMDModel3D[];
		/** 项目定义集合（Item single） */
		ItemsSingle?: EDMDItemSingle[];
		/** 项目实例集合（Item assembly） */
		ItemsAssembly?: EDMDItemAssembly[];
		/** 历史记录集合（可选） */
		Histories?: EDMDHistory[];
	};
	/** 处理指令 */
	ProcessInstruction: EDMDProcessInstruction;
}
