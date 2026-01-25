// ============= 项目和相关类型 =============
// DESIGN: EDMDItem是IDX协作的核心概念，代表任何可协作对象
// REF: Section 4.1
// NOTE: 项目可以是单个组件或装配体（包含多个子项目）

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
 * 几何类型枚举
 *
 * @remarks
 * IDXv4.0+引入的简化方式的关键属性，直接标识项目的类型和功能
 * 替代传统方式中的"Third Item"对象，减少XML嵌套和文件大小
 * REF: Section 6.1 (Table 8), Section 6.9 (Table 8)
 */
export enum EDMDGeometryType {
	// ------------ 板相关 ------------
	/** 板轮廓：定义PCB板的外形轮廓和厚度 */
	BOARD_OUTLINE = 'BOARD_OUTLINE',
	/** 柔性板区域：定义柔性电路板的可弯曲区域 */
	BOARD_AREA_FLEXIBLE = 'BOARD_AREA_FLEXIBLE',
	/** 刚性板区域：定义PCB中的刚性支撑区域 */
	BOARD_AREA_RIGID = 'BOARD_AREA_RIGID',
	/** 加强板区域：定义用于增加刚性的加强区域 */
	BOARD_AREA_STIFFENER = 'BOARD_AREA_STIFFENER',

	// ------------ 组件相关 ------------
	/** 电气元件：标准电气元件（电阻、电容、IC等） */
	COMPONENT = 'COMPONENT',
	/** 机械元件：非电气元件（散热器、安装支架等） */
	COMPONENT_MECHANICAL = 'COMPONENT_MECHANICAL',

	// ------------ 孔相关 ------------
	/** 电镀孔：具有导电镀层的通孔（PTH） */
	HOLE_PLATED = 'HOLE_PLATED',
	/** 非电镀孔：无导电镀层的机械孔（NPTH） */
	HOLE_NON_PLATED = 'HOLE_NON_PLATED',
	/** 电镀铣削切口：通过铣削工艺形成的电镀切口 */
	HOLE_PLATED_MILLED = 'HOLE_PLATED_MILLED',
	/** 非电镀铣削切口：通过铣削工艺形成的非电镀切口 */
	HOLE_NONPLATED_MILLED = 'HOLE_NONPLATED_MILLED',
	/** 过孔：用于连接不同信号层的镀铜孔 */
	VIA = 'VIA',
	/** 填充过孔：内部填充材料（树脂/铜）的过孔 */
	FILLED_VIA = 'FILLED_VIA',

	// ------------ 禁止区域相关 ------------
	/** 布线禁布区：禁止布线的区域 */
	KEEPOUT_AREA_ROUTE = 'KEEPOUT_AREA_ROUTE',
	/** 元件禁布区：禁止放置元件的区域 */
	KEEPOUT_AREA_COMPONENT = 'KEEPOUT_AREA_COMPONENT',
	/** 过孔禁布区：禁止放置过孔的区域 */
	KEEPOUT_AREA_VIA = 'KEEPOUT_AREA_VIA',
	/** 测试点禁布区：禁止放置测试点的区域 */
	KEEPOUT_AREA_TESTPOINT = 'KEEPOUT_AREA_TESTPOINT',
	/** 热禁布区：因热考虑需要保持空旷的区域 */
	KEEPOUT_AREA_THERMAL = 'KEEPOUT_AREA_THERMAL',
	/** 其他禁布区：未分类的其他类型禁布区域 */
	KEEPOUT_AREA_OTHER = 'KEEPOUT_AREA_OTHER',

	// ------------ 保持区域相关 ------------
	/** 布线保持区：必须布线的区域（保持布线） */
	KEEPIN_AREA_ROUTE = 'KEEPIN_AREA_ROUTE',
	/** 元件保持区：必须放置元件的区域 */
	KEEPIN_AREA_COMPONENT = 'KEEPIN_AREA_COMPONENT',
	/** 过孔保持区：必须放置过孔的区域 */
	KEEPIN_AREA_VIA = 'KEEPIN_AREA_VIA',
	/** 测试点保持区：必须放置测试点的区域 */
	KEEPIN_AREA_TESTPOINT = 'KEEPIN_AREA_TESTPOINT',
	/** 热保持区：因热考虑需要填充的区域 */
	KEEPIN_AREA_THERMAL = 'KEEPIN_AREA_THERMAL',
	/** 其他保持区：未分类的其他类型保持区域 */
	KEEPIN_AREA_OTHER = 'KEEPIN_AREA_OTHER',

	// ------------ 布局区域 ------------
	/** 放置组区域：逻辑上相关的元件分组区域（不强制放置） */
	PLACEMENT_GROUP_AREA = 'PLACEMENT_GROUP_AREA',
	/** 其他轮廓/用户区域：用户自定义的未分类区域（如logo位置等） */
	OTHER_OUTLINE = 'OTHER_OUTLINE',

	// ------------ 层相关 ------------
	/** 阻焊层：用于防止焊锡粘附的绝缘层 */
	LAYER_SOLDERMASK = 'LAYER_SOLDERMASK',
	/** 焊膏层：用于SMT焊接的锡膏印刷层 */
	LAYER_SOLDERPASTE = 'LAYER_SOLDERPASTE',
	/** 丝印层：用于印刷标识和符号的油墨层 */
	LAYER_SILKSCREEN = 'LAYER_SILKSCREEN',
	/** 通用层：未指定具体用途的通用层 */
	LAYER_GENERIC = 'LAYER_GENERIC',
	/** 胶层：用于固定元件的粘合剂层 */
	LAYER_GLUE = 'LAYER_GLUE',
	/** 胶掩膜层：定义胶层应用区域的掩膜 */
	LAYER_GLUEMASK = 'LAYER_GLUEMASK',
	/** 焊膏掩膜层：定义焊膏应用区域的掩膜 */
	LAYER_PASTEMASK = 'LAYER_PASTEMASK',
	/** 其他信号层：常规信号走线层 */
	LAYER_OTHERSIGNAL = 'LAYER_OTHERSIGNAL',
	/** 仅焊盘层：只包含焊盘连接点的层 */
	LAYER_LANDSONLY = 'LAYER_LANDSONLY',
	/** 电源/地层：用于电源分配和接地的层 */
	LAYER_POWERGROUND = 'LAYER_POWERGROUND',
	/** 嵌入式电容介质层：用于嵌入式电容的介质材料层 */
	LAYER_EMBEDDED_CAP_DIELECTRIC = 'LAYER_EMBEDDED_CAP_DIELECTRIC',
	/** 嵌入式电阻层：用于嵌入式电阻的材料层 */
	LAYER_EMBEDDED_RESISTOR = 'LAYER_EMBEDDED_RESISTOR',
	/** 介质层：绝缘隔离材料层（FR4等） */
	LAYER_DIELECTRIC = 'LAYER_DIELECTRIC',
	/** 层堆叠定义：多个物理层的堆叠顺序定义 */
	LAYER_STACKUP = 'LAYER_STACKUP',
	/** 通用层定义：未指定类型的通用层（兼容性） */
	LAYER = 'LAYER',

	// ------------ 弯曲区域 ------------
	/** 弯曲区域：定义柔性板的弯曲位置和参数 */
	BEND = 'BEND',

	// ------------ 铜相关 ------------
	/** 铜焊盘：元件引脚的铜连接区域 */
	COPPER_PAD = 'COPPER_PAD',
	/** 铜走线：信号连接的铜线条 */
	COPPER_TRACE = 'COPPER_TRACE',
	/** 铜皮区域：大面积的铜填充区域（用于接地/电源） */
	COPPER_AREA = 'COPPER_AREA',
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
	/** 几何类型（优化方式使用） */
	geometryType?: EDMDGeometryType;
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
	geometryType?: EDMDGeometryType;
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
