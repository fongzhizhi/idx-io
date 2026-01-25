// ============= IDX协议核心基础类型 =============
// DESIGN: 基础类型设计参考IDXv4.5规范第4-6章
// NOTE: 所有IDX类型都扩展自EDMDObject，包含通用属性
// REF: PSI5_IDXv4.5_Implementation_Guidelines.pdf Section 4

// ============= 通用基础接口 =============

/**
 * IDX协议中所有对象的基接口
 *
 * @remarks
 * IDX规范中所有对象都包含id和可能的属性变更标记
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
	/** 用户自定义属性 */
	UserProperties?: EDMDUserSimpleProperty[];
}

// ============= 用户属性类型 =============
/**
 * 用户自定义简单属性
 *
 * @remarks
 * 用于存储ECAD/MCAD系统的特定属性
 * xsi:type="property:EDMDUserSimpleProperty"
 */
export interface EDMDUserSimpleProperty {
	/** 属性键，包含系统范围和对象名 */
	Key: EDMDName;
	/** 属性值，可以是字符串、数字或布尔值 */
	Value: string | number | boolean;
	/** 是否已变更（可选） */
	IsChanged?: boolean;
	/** 是否为新属性（可选） */
	IsNew?: boolean;
	/** 是否持久化（可选） */
	Persistent?: boolean;
	/** 是否创建者（可选） */
	IsOriginator?: boolean;
}

/**
 * 用户自定义属性通用枚举
 * 用于在 EDMDItem 或 EDMDItemInstance 中存储自定义属性
 */
export enum UserSimpleProperty {
	/** 下边界（Z轴），通常用于定义层或几何体的起始高度 */
	LowerBound = 'LowerBound',
	/** 上边界（Z轴），通常用于定义层或几何体的结束高度 */
	UpperBound = 'UpperBound',
	/** 层类型，如 SolderMask、Signal、SilkScreen 等（见表4） */
	LayerType = 'LayerType',
	/** 板厚，用于简单板的厚度定义 */
	Thickness = 'THICKNESS',
	/** 层堆叠总厚度 */
	TotalThickness = 'TotalThickness',
	/** 参考标志符（如 "C11"），用于标识组件实例 */
	REFDES = 'REFDES',
	/** 零件编号（如 "12333-CAP"） */
	PARTNUM = 'PARTNUM',
	/** 封装名称（如 "CC1206"） */
	PKGNAME = 'PKGNAME',
	/** 安装孔名称标识 */
	MHNAME = 'MHNAME',
	/** 焊盘堆栈名称，用于孔的库引用 */
	PADSTACK = 'PADSTACK',
	/** 项目类型，如 "BOARDOUTLINE" 标识板轮廓 */
	TYPE = 'TYPE',
	/** 操作功率等级（单位：瓦特） */
	POWER_OPR = 'POWER_OPR',
	/** 最大功率等级（单位：瓦特） */
	POWER_MAX = 'POWER_MAX',
	/** 热导率（单位：W/m·°C） */
	THERM_COND = 'THERM_COND',
	/** 结到板热阻（单位：°C/W） */
	THETA_JB = 'THETA_JB',
	/** 结到壳热阻（单位：°C/W） */
	THETA_JC = 'THETA_JC',
	/** 电阻值（单位：欧姆） */
	RESISTANCE = 'RESISTANCE',
	/** 电容值（单位：法拉） */
	CAPACITANCE = 'CAPACITANCE',
	/** 电感值（单位：亨利） */
	INDUCTANCE = 'INDUCTANCE',
	/** 容差（单位：百分比） */
	TOLERANCE = 'TOLERANCE',
	/** 侧面标识（TOP、BOTTOM、INNER），用于布线层 */
	SIDE = 'SIDE',
	/** 映射层名称，用于用户区域到ECAD设计层的映射 */
	MAPPED_LAYER = 'MAPPED_LAYER',
	/** 弯曲序列号，用于定义弯曲应用顺序 */
	bendSequenceNumber = 'bendSequenceNumber',
}

// ============= 几何基础类型 =============
/**
 * 长度属性接口
 * 
 * @remarks
 * 用于表示IDX中的长度值，通常用于坐标、尺寸等
 */
export interface EDMDLengthProperty {
	/** 数值，单位由上下文定义（通常为毫米） */
	Value: number;
	/** 可选单位说明，如未指定则使用GlobalUnitLength */
	Unit?: GlobalUnit;
	/** 标记属性是否已变更（可选） */
	IsAttributeChanged?: boolean;
}

/**
 * 二维笛卡尔坐标点
 *
 * @remarks
 * - 用于描述PCB板上的位置
 * - xsi:type="property:EDMDLengthProperty"
 * - REF: Section 7.1.10
 */
export interface EDMDCartesianPoint extends EDMDObject {
	/** X坐标值 */
	X: number;
	/** Y坐标值 */
	Y: number;
	/** Z坐标值(不常用) */
	Z?: number;
}

// ============= 标识符和引用类型 =============
/**
 * 对象名称，用于跨系统引用
 *
 * @remarks
 * 包含系统范围和对象名称，确保在协作中正确引用
 */
export interface EDMDName {
	/** 系统作用域，定义对象的唯一命名空间 */
	SystemScope: string;
	/** 对象名称，在系统作用域内的唯一标识 */
	ObjectName: string;
	/** 标记属性是否已变更（可选） */
	IsAttributeChanged?: boolean;
	/** 是否持久化（可选） */
	Persistent?: boolean;
	/** 是否创建者（可选） */
	IsOriginator?: boolean;
}

/**
 * 标识符定义
 *
 * @remarks
 * 用于唯一标识一个项目，包含系统范围、编号、版本、修订和序列号
 * REF: Section 5.2.1
 */
export interface EDMDIdentifier {
	/** 系统范围，定义命名空间 */
	SystemScope: string;
	/** 项目编号，在系统范围内唯一 */
	Number: string;
	/** 版本号 */
	Version: string;
	/** 修订号 */
	Revision: string;
	/** 序列号，用于变更跟踪 */
	Sequence: string;
	/** 是否属性已变更 */
	IsAttributeChanged?: boolean;
	/** 是否持久化 */
	Persistent?: boolean;
	/** 是否创建者 */
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
	RoleName: EDMDName;
	RoleType: 'owner' | 'reviewer' | 'designer';
	Category: 'Mechanical' | 'Electrical' | 'Both';
	Function: 'Design' | 'Review' | 'Manufacturing';
	Context: string; // 引用的ItemInstance ID
}
