// ============= 项目和相关类型 =============
// DESIGN: EDMDItem是IDX协作的核心概念，代表任何可协作对象
// REF: Section 4.1
// NOTE: 项目可以是单个组件或装配体（包含多个子项目）

import { EDMDObject, EDMName, EDMDTransformation, EDMDLengthProperty, EDMDUserSimpleProperty, EDMDIdentifier, CartesianPoint } from './common';
import { GeometryType, ItemType } from './enums';
import { ShapeType, EDMD3DModel, EDMDShapeElement } from './geometry';
import { IDXComputationalTag, IDXProcessInstruction } from './namespace.types';

// ------------ 项目实例 ------------
/**
 * 项目实例，表示项目中某个具体实例
 *
 * @remarks
 * 同一项目可以有多个实例（如多个相同组件）
 * REF: Section 4.1, Figure 7-8
 */
export interface EDMDItemInstance extends EDMDObject {
	/** 引用的项目（项目 ID 字符串引用） */
	Item: string; // 引用EDMDItem的id

	/** 实例名称 */
	InstanceName: EDMName;

	/** 变换矩阵（实例的位置和方向） */
	Transformation?: EDMDTransformation;

	/** Z轴偏移（相对于装配到的表面，IDX v4.5+） */
	zOffset?: number;

	/** 装配到名称（用于相对层定位，引用 ReferenceName） */
	AssembleToName?: string;

	/** 弯曲序列号（用于柔性板弯曲顺序） */
	bendSequenceNumber?: number;

	/** 用户自定义属性 */
	UserProperties?: EDMDUserSimpleProperty[];

	/** 用户区域层名称（仅用于UserArea类型） */
	InstanceUserAreaLayerName?: EDMName;
}

// ------------ 项目基类 ------------
/**
 * EDMD项目基类
 *
 * @remarks
 * 所有PCB特征（板、组件、孔等）都表示为EDMDItem
 * DESIGN: 使用几何类型属性简化IDXv4.0表示
 */
export interface EDMDItem extends EDMDObject {
	/** 项目类型（单个/装配体） */
	ItemType: ItemType;

	/** 项目标识符 */
	Identifier?: EDMDIdentifier;

	/** 包名称（用于组件） */
	PackageName?: EDMName;

	/** 几何类型（IDX V4.5 标准几何类型，可选） */
	geometryType?: GeometryType;

	/** 参考名称（用于相对定位和被引用）- 根据协议专家反馈，使用简洁的字符串值 */
	ReferenceName?: string;

	/** 装配到名称（用于相对层定位，引用 ReferenceName） */
	AssembleToName?: string;

	/** 基线标记（是否属于基线） */
	BaseLine?: boolean;

	/** 基线标记（demo格式，已废弃） */
	Baseline?: {
		Value: string;
	};

	/** 项目形状 */
	Shape?: ShapeType | string; // string用于引用已定义的形状

	/** 3D模型引用（仅用于组件） */
	EDMD3DModel?: EDMD3DModel | string;

	/** 组件引脚定义（仅用于组件） */
	PackagePins?: PackagePin[];

	/** 用户自定义属性 */
	UserProperties?: EDMDUserSimpleProperty[];

	/** 项目实例（仅当ItemType为ASSEMBLY时） */
	ItemInstances?: EDMDItemInstance[];

	/** 临时存储的几何元素（用于构建过程） */
	geometricElements?: any[];

	/** 临时存储的曲线集（用于构建过程） */
	curveSet2Ds?: any[];

	/** 临时存储的形状元素（用于构建过程） */
	shapeElements?: any[];
}

// ------------ 组件引脚类型 ------------
/**
 * 组件引脚定义
 *
 * @remarks
 * IDXv4.0引入的简化引脚表示方法
 * REF: Section 6.2.1.5
 */
export interface PackagePin {
	/** 引脚编号 */
	pinNumber: string;

	/** 是否为主要引脚（Pin 1） */
	primary: boolean;

	/** 引脚位置点 */
	Point: CartesianPoint;

	/** 引脚形状 */
	Shape: EDMDShapeElement | string;
}

// ------------ 数据集体 ------------
/**
 * EDMD数据集体
 *
 * @remarks
 * 包含所有项目和形状的集合
 * REF: Section 4
 */
export interface EDMDDataSetBody {

	/** 几何元素集合 */
	GeometricElements?: any[];
	
	/** 曲线集合 */
	CurveSet2Ds?: any[];

	/** 形状元素集合 */
	ShapeElements?: any[];
	
	/** 项目集合 */
	Items: EDMDItem[];
	
	/** 3D模型集合 */
	Models3D?: EDMD3DModel[];
	
	/** 形状集合 */
	Shapes?: ShapeType[];
}

// ------------ 交易和变更历史 ------------
/**
 * 单个变更定义
 *
 * @remarks
 * 表示对项目的单个变更操作
 * REF: Section 5.2.1, Figure 18
 */
export interface EDMDChange {
	/** 变更标识符 */
	id: string;

	/** 新项目引用 */
	NewItem?: EDMDIdentifier;

	/** 前驱项目引用 */
	PredecessorItem?: EDMDIdentifier;

	/** 接受状态（用于响应文件） */
	Accept?: boolean;

	/** 注释说明 */
	Description?: string;

	/** 删除的实例名称（用于删除操作） */
	DeletedInstanceName?: string;
}

/**
 * 交易（一组变更）
 *
 * @remarks
 * 一个交易包含多个相关变更
 * REF: Section 5.2.1
 */
export interface EDMDTransaction {
	/** 交易标识符 */
	id: string;

	/** 执行变更的用户/系统 */
	Actor?: string;

	/** 变更列表 */
	Changes: EDMDChange[];

	/** 变更描述 */
	Description?: string;
}

/**
 * 历史记录条目
 *
 * @remarks
 * 记录变更的接受/拒绝历史
 * REF: Section 5.4
 */
export interface EDMHistoryEntry extends EDMDObject {
	/** 创建者 */
	Creator: string;

	/** 文本描述 */
	Text: string;

	/** 系统范围 */
	SystemScope: string;

	/** 创建日期时间 */
	CreationDateTime: string;

	/** 相关历史记录 */
	History: string; // 引用EDMHistory的id

	/** 主题（引用变更或接受对象） */
	Subject: string;
}

/**
 * 历史记录集合
 */
export interface EDMHistory extends EDMDObject {
	/** 主题（引用交易或变更） */
	Subject: string;

	/** 历史条目 */
	HistoryEntries: EDMHistoryEntry[];
}

// ------------ 过程指令 ------------
/**
 * 过程指令基类
 *
 * @remarks
 * 定义消息类型和操作指令
 */
export interface EDMDProcessInstruction extends EDMDObject {
	/** 指令类型 */
	instructionType: IDXProcessInstruction;
}

/**
 * 发送信息指令
 *
 * @remarks
 * 用于发送基线数据
 * REF: Section 5.1
 */
export interface EDMDProcessInstructionSendInformation extends EDMDProcessInstruction {
	instructionType: IDXComputationalTag.SendInformation;

	/** 执行者（可选） */
	Actor?: string;

	/** 描述信息（可选） */
	Description?: string;
}

/**
 * 发送变更指令
 *
 * @remarks
 * 用于发送变更请求或响应
 * REF: Section 5.2
 */
export interface EDMDProcessInstructionSendChanges extends EDMDProcessInstruction {
	instructionType: IDXComputationalTag.SendChanges;

	/** 执行者 */
	Actor?: string;

	/** 描述信息（可选） */
	Description?: string;

	/** 变更类型（可选） */
	ChangeType?: 'Proposal' | 'Response';

	/** 相关指令引用（可选） */
	RelatedInstruction?: string;

	/** 变更交易 */
	Changes?: EDMDTransaction[];

	/** 清除状态（用于清除文件） */
	ClearanceState?: boolean;
}

/**
 * 请求信息指令
 *
 * @remarks
 * 用于请求当前状态信息（目前很少使用）
 * REF: Section 3
 */
export interface EDMDProcessInstructionRequestForInformation extends EDMDProcessInstruction {
	instructionType: IDXComputationalTag.RequestForInformation;

	/** 请求的项目标识符 */
	RequestedItems: EDMDIdentifier[];
}
