// ============= IDX协议核心基础类型 =============
// DESIGN: 基础类型设计参考IDXv4.5规范第4-6章
// NOTE: 所有IDX类型都扩展自EDMDObject，包含通用属性
// REF: PSI5_IDXv4.5_Implementation_Guidelines.pdf Section 4

import { StratumSurfaceDesignation, StratumType } from './enums';

// ============= 通用基础接口 =============
/**
 * IDX协议中所有对象的基接口
 *
 * @remarks
 * IDX规范中所有对象都包含id和可能的属性变更标记
 *
 * @example
 * ```typescript
 * // TEST_CASE: 创建基础对象
 * const obj: EDMDObject = {
 *   id: "ITEM_001",
 *   IsAttributeChanged: false
 * };
 * ```
 */
export interface EDMDObject {
	/** 对象唯一标识符，在上下文中必须唯一 */
	id: string;
	/** 标记对象属性是否已变更 */
	IsAttributeChanged?: boolean;
	/** 对象名称 */
	Name?: string;
	/** 对象描述 */
	Description?: string;
}

// ============= 几何基础类型 =============
/**
 * 二维笛卡尔坐标点
 *
 * @remarks
 * 用于描述PCB板上的位置，单位由GlobalUnitLength定义
 * REF: Section 7.1.10
 */
export interface CartesianPoint extends EDMDObject {
	/** X坐标值 */
	X: number;
	/** Y坐标值 */
	Y: number;
	/** Z坐标值(不常用) */
	Z?: number;
}

/**
 * 长度属性值
 *
 * @remarks
 * IDX中所有长度值都应包装在此类型中，确保单位一致性
 * BUSINESS: 所有几何尺寸必须使用GlobalUnitLength指定的单位
 */
export interface EDMDLengthProperty {
	/** 数值 */
	Value: number;
	/** 单位，可选，默认为 Header 中的 GlobalUnitLength */
	Unit?: GlobalUnit;
}

// ============= 标识符和引用类型 =============
/**
 * 系统范围内唯一标识符
 *
 * @remarks
 * IDX使用五元组标识符确保在协作过程中的唯一性
 * REF: Section 5.2.1
 */
export interface EDMDIdentifier {
	/** 创建该标识符的系统范围 */
	SystemScope: string;
	/** 标识符编号 */
	Number: string;
	/** 版本号，通常从1开始 */
	Version: number;
	/** 修订号 */
	Revision: number;
	/** 序列号，每次变更递增 */
	Sequence: number;
}

/**
 * 对象名称，用于跨系统引用
 *
 * @remarks
 * 包含系统范围和对象名称，确保在协作中正确引用
 */
export interface EDMName {
	SystemScope: string;
	ObjectName: string;
}

// ============= 用户属性类型 =============
/**
 * 用户自定义简单属性
 *
 * @remarks
 * 用于存储ECAD/MCAD系统的特定属性
 * 使用正确的类型名称 property:EDMDUserSimpleProperty
 * TEST_CASE: 添加组件参数属性
 * TEST_EXPECT: 正确序列化为XML属性
 */
export interface EDMDUserSimpleProperty {
	Key: EDMName;
	Value: string | number | boolean;
	IsChanged?: boolean;
	IsNew?: boolean;
	Persistent?: boolean;
	IsOriginator?: boolean;
}

// ============= 变换矩阵类型 =============
/**
 * 2D变换矩阵
 *
 * @remarks
 * 用于描述2D空间中的平移、旋转和缩放
 * 移除 xsi:type，使用 TransformationType 元素
 * 平移分量使用 { Value: number } 格式
 * REF: Section 4.1.1.1
 * DESIGN: 使用标准变换矩阵表示，与3D图形系统兼容
 */
export interface EDMDTransformation2D {
	/** 变换类型标识 */
	TransformationType: 'd2';

	// 旋转分量
	xx: number; // cosθ
	xy: number; // -sinθ
	yx: number; // sinθ
	yy: number; // cosθ

	// 平移分量（使用 foundation:Value 包装）
	tx: number;
	ty: number;

	// 可选Z偏移，用于相对层定位
	zOffset?: number;
}

/**
 * 3D变换矩阵
 *
 * @remarks
 * 完整3D变换，用于绝对定位
 * 平移分量使用 { Value: number } 格式
 * PERFORMANCE: 3D变换在大多数IDX实现中较少使用
 */
export interface EDMDTransformation3D {
	/** 变换类型标识 */
	TransformationType: 'd3';

	// 旋转分量
	xx: number;
	xy: number;
	xz: number;
	yx: number;
	yy: number;
	yz: number;
	zx: number;
	zy: number;
	zz: number;

	// 平移分量（使用 foundation:Value 包装）
	tx: number;
	ty: number;
	tz: number;
}

export type EDMDTransformation = EDMDTransformation2D | EDMDTransformation3D;

// ============= 全局单位和头部信息 =============
/**
 * 全局单位定义
 *
 * @remarks
 * IDX文件必须指定全局长度单位，确保所有系统使用一致的单位
 * BUSINESS: 大多数PCB设计使用毫米(mm)作为单位
 */
export enum GlobalUnit {
	UNIT_MM = 'UNIT_MM',
	UNIT_INCH = 'UNIT_INCH',
	UNIT_MIL = 'UNIT_MIL',
	UNIT_CM = 'UNIT_CM',
}

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

/**
 * 角色和所有权信息
 *
 * @remarks
 * 用于标记项目的协作权限（机械/电气）
 * REF: Section 4.1.3
 */
export interface RoleOnItemInstance {
	RoleName: EDMName;
	RoleType: 'owner' | 'reviewer' | 'designer';
	Category: 'Mechanical' | 'Electrical' | 'Both';
	Function: 'Design' | 'Review' | 'Manufacturing';
	Context: string; // 引用的ItemInstance ID
}

// ============= 层技术定义 =============

/**
 * 层技术类型
 *
 * @remarks
 * 定义层的技术特性
 * REF: Section 6.1.2.3
 */
export interface EDMDStratumTechnology extends EDMDObject {
	/** 技术类型：Design 或 Documentation */
	TechnologyType: 'Design' | 'Documentation';
	/** 层用途 */
	LayerPurpose:
		| 'OtherSignal'
		| 'PowerOrGround'
		| 'SolderMask'
		| 'SilkScreen'
		| 'LandsOnly'
		| 'SolderPaste'
		| 'PasteMask'
		| 'Dielectric';
}
