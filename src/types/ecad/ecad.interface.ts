import { Arc } from '../../libs/geometry/Arc';
import { Circle } from '../../libs/geometry/Circle';
import { Line } from '../../libs/geometry/Line';
import { Polyline } from '../../libs/geometry/Polyline';
import { Rect } from '../../libs/geometry/Rect';
import { Vector2 } from '../../libs/geometry/Vector2';
import { EDMDIdentifier, EDMDTransformation3D, EDMDUserSimpleProperty, GlobalUnit, RoleOnItemInstance } from '../core/base.types';

/**
 * ECAD 系统数据顶层结构
 *
 * @remarks
 * 该接口表示从ECAD系统导出的完整数据集，用于后续转换为IDX格式。
 * 包含了PCB设计的所有要素：板子、组件、过孔、禁布区等。
 * REF: IDXv4.5 Implementation Guidelines
 */
export interface ECADData {
	/** 设计元数据信息 */
	metadata: ECADMeta;

	/** PCB板定义，包含轮廓、厚度及可能的层堆叠信息 */
	board: ECADBoard;

	/** 层定义表(layerId -> ECADLayer) */
	layers?: Record<string, ECADLayer>;
	/** 层堆叠定义表(stackId -> ECADLayerStackup) */
	stackups?: Record<string, ECADLayerStackup>;

	/** 3D模型表(modelId -> ECADModel3D) */
	models: Record<string, ECADModel3D>;
	/** 封装库表(footprintName -> ECADFootprint) */
	footprints: Record<string, ECADFootprint>;

	/** 放置在板上的元件实例列表 */
	components: ECADComponent[];
	/** 钻孔和过孔列表 */
	holes: ECADHole[];
	/** 禁布区和保持区约束列表 */
	constraints: ECADConstraintArea[];

	/** 非协作设计数据（可选），如走线、铜皮、丝印等 */
	nonCollaborative?: ECADNonCollaborativeData;
}

/**
 * 层类型枚举
 *
 * @remarks
 * 定义PCB制造中使用的各种物理层类型，对应IDX协议中的LayerPurpose枚举。
 * 枚举值基于IDXv4.5协议文档Table 4定义。
 * REF: Section 6.1.2, Table 4
 */
export enum ECADLayerType {
	/**
	 * 信号层，用于电气走线
	 * @remarks 包含常规信号和时钟信号，通常为薄铜层
	 */
	SIGNAL = 'SIGNAL',
	/**
	 * 电源或地层，通常为完整铜平面
	 * @remarks 用于电源分配、接地、EMI屏蔽
	 */
	POWER_GROUND = 'POWER_GROUND',
	/**
	 * 介质层，绝缘材料
	 * @remarks 如FR4、聚酰亚胺等，提供电气隔离和机械支撑
	 */
	DIELECTRIC = 'DIELECTRIC',
	/**
	 * 阻焊层，保护铜层并定义焊接区域
	 * @remarks 通常为绿油，防止短路和氧化
	 */
	SOLDERMASK = 'SOLDERMASK',
	/**
	 * 丝印层，元件标识和文字
	 * @remarks 白色油墨，用于标识元件位置、方向和极性
	 */
	SILKSCREEN = 'SILKSCREEN',
	/**
	 * 焊膏层，定义SMT元件焊接区域
	 * @remarks 用于锡膏印刷，定义焊盘上的焊膏区域
	 */
	SOLDERPASTE = 'SOLDERPASTE',
	/**
	 * 焊膏掩膜层
	 * @remarks 定义焊膏应用区域，通常与焊膏层互补
	 */
	PASTEMASK = 'PASTEMASK',
	/**
	 * 胶层，用于元件固定
	 * @remarks 用于SMT元件的底部填充或加固
	 */
	GLUE = 'GLUE',
	/**
	 * 胶掩膜层
	 * @remarks 定义胶层应用区域，通常与胶层互补
	 */
	GLUEMASK = 'GLUEMASK',
	/**
	 * 嵌入式电容介质层
	 * @remarks 用于制造嵌入式去耦电容的特殊介质材料
	 */
	EMBEDDED_CAP_DIELECTRIC = 'EMBEDDED_CAP_DIELECTRIC',
	/**
	 * 嵌入式电阻层
	 * @remarks 用于制造嵌入式电阻的特殊材料层
	 */
	EMBEDDED_RESISTOR = 'EMBEDDED_RESISTOR',
	/**
	 * 通用层
	 * @remarks 未指定具体用途的通用层，可用于特殊应用
	 */
	GENERIC = 'GENERIC',
	/**
	 * 其他类型层
	 * @remarks 不属于上述类别的特殊层类型
	 */
	OTHER = 'OTHER',
}

/**
 * PCB层定义
 *
 * @remarks
 * 定义PCB的一个物理层，包含材料、厚度等信息。
 * 多层板设计时需要明确定义每个层。
 * REF: Section 6.1.2.1
 */
export interface ECADLayer {
	/** 层唯一标识符 */
	id: string;
	/** 层名称, 必须唯一, 层堆叠引用名 */
	name: string;
	/** 层类型，决定其在制造中的用途 */
	type: ECADLayerType;
	/** 层厚度，单位与全局单位一致 */
	thickness: number;
	/** 层材料描述（可选） */
	material?: string;
	/** 显示颜色（可选，用于可视化） */
	color?: string;
}

/**
 * 层堆叠定义
 *
 * @remarks
 * 定义多个层的堆叠顺序和位置，形成板截面的"三明治"结构。
 * 一个设计可以有多个堆叠（如刚柔结合板的不同区域）。
 * REF: Section 6.1.2.2
 */
export interface ECADLayerStackup {
	/** 堆叠唯一标识符 */
	id: string;
	/** 堆叠名称，用于其他元素引用 */
	name: string;
	/** 按堆叠顺序排列的层ID列表，从底部到顶部 */
	layerIds: string[];
}

/**
 * 层区域定义
 *
 * @remarks
 * 定义PCB上具有特定层堆叠的XY区域。
 * 用于支持刚柔结合板等复杂设计。
 * REF: Section 6.1.2.3
 */
export interface ECADLayerZone {
	/** 区域唯一标识符 */
	id: string;
	/** 区域名称 */
	name: string;
	/** 区域形状（闭合轮廓） */
	geometry: ECADClosedGeometry;
	/** 关联的层堆叠ID */
	stackupId: string;
	/** 区域类型，决定其机械特性 */
	zoneType: 'RIGID' | 'FLEXIBLE' | 'STIFFENER';
}

/**
 * 弯曲区域定义
 *
 * @remarks
 * 定义柔性板中的弯曲区域，包含弯曲参数和几何信息。
 * REF: Section 6.1.2.4
 */
export interface ECADBend {
	/** 弯曲唯一标识符 */
	id: string;
	/** 弯曲名称 */
	name: string;
	/** 弯曲影响区域形状 */
	bendArea: Polyline;
	/** 弯曲轴线定义 */
	bendLine: Line;
	/** 弯曲参数 */
	parameters: ECADBendParameters;
	/** 关联的柔性区域ID */
	flexibleZoneId: string;
}

/**
 * 弯曲参数
 *
 * @remarks
 * 定义弯曲的几何和顺序参数。
 */
export interface ECADBendParameters {
	/** 弯曲顺序号（可选），决定多个弯曲的应用顺序 */
	sequenceNumber?: number;
	/** 弯曲内侧，相对于板子参考面 */
	innerSide: 'TOP' | 'BOTTOM';
	/** 弯曲内半径 */
	innerRadius: number;
	/** 弯曲角度（度） */
	bendAngle: number;
}

/**
 * ECAD对象基接口
 *
 * @remarks
 * 所有ECAD设计对象的公共属性。
 * 这些属性将映射到IDX格式中的EDMDItem通用属性。
 */
export interface ECADObject {
	/** 对象名称 */
	name?: string;
	/** 对象描述 */
	description?: string;
	/** 属性变更标志（可选） */
	isAttrChanged?: boolean;
	/** 唯一标识符（可选），用于版本控制和变更追踪 */
	identifier?: EDMDIdentifier;
	/** 基线标志，表示该对象是否为基线的一部分 */
	baseLine?: boolean;
	/** 用户自定义属性列表（可选） */
	userProperties?: EDMDUserSimpleProperty[];
	/** 角色和权限信息（可选），用于定义协作权限 */
	roles?: RoleOnItemInstance[];
}

/** ECAD 轮廓定义 */
export type ECADGeometry = ECADOpenGeometry | ECADClosedGeometry;

/** ECAD 开放几何路径 */
export type ECADOpenGeometry = Line | Arc;

/** ECAD 闭合几何轮廓 */
export type ECADClosedGeometry = Polyline | Circle | Rect;

/**
 * PCB板定义
 *
 * @remarks
 * 定义PCB板的轮廓、厚度和结构特征。
 * 支持简单单层板到复杂的多层刚柔结合板。
 */
export interface ECADBoard extends ECADObject {
	/** 板轮廓几何形状（闭合轮廓） */
	outline: ECADClosedGeometry;

	/**
	 * 板厚度（简单板）
	 * @remarks 当使用简单板模型时指定，与层堆叠方式互斥
	 */
	thickness?: number;
	/** 引用层堆叠ID（复杂版） */
	stackupId?: string;

	/** 板子特征（可选） */
	features?: ECADBoardFeatures;

	/** 层区域定义列表（复杂板，如刚柔结合板） */
	zones?: ECADLayerZone[];
	/** 弯曲定义列表（柔性板） */
	bends?: ECADBend[];
}

/**
 * 板子特征
 *
 * @remarks
 * 定义板子上的机械特征，如切割区域和铣削路径。
 */
export interface ECADBoardFeatures {
	/** 切割区域列表（从板材料中去除的区域） */
	cutouts?: ECADClosedGeometry[];
	/** 铣削路径列表 */
	milling?: ECADMillingPath[];
}

/**
 * 铣削路径定义
 *
 * @remarks
 * 定义使用圆形刀具进行铣削的路径。
 * REF: Section 6.4
 */
export interface ECADMillingPath {
	/** 刀具路径几何（开放或闭合路径） */
	path: ECADGeometry;
	/** 刀具直径 */
	toolDiameter: number;
	/** 铣削深度（相对于参考面） */
	depth: number;
	/** 是否为金属化铣削（可选） */
	isPlated?: boolean;
}

/**
 * 3D模型引用
 *
 * @remarks
 * 引用外部3D模型文件，用于元件的精确几何表示。
 * REF: Section 6.2.1.3
 */
export interface ECADModel3D {
	/** 模型标识符（文件名或数据库ID） */
	identifier: string;
	/** 模型文件格式 */
	format: 'STEP' | 'STL' | 'IGES' | 'PARASOLID' | 'SOLIDWORKS' | 'NX' | 'CATIA';
	/** 模型版本/配置（可选） */
	version?: string;
	/** 模型文件位置（相对路径，可选） */
	location?: string;
	/** 对齐变换矩阵（可选），用于将模型与封装对齐 */
	transformation?: EDMDTransformation3D;
}

/**
 * 封装（元件封装）定义
 *
 * @remarks
 * 定义元件的几何形状、引脚排列和物理属性。
 * 可被多个元件实例共享。
 */
export interface ECADFootprint extends ECADObject {
	/** 封装名称，在库中必须唯一 */
	packageName: string;
	/** 封装几何信息 */
	geometry: ECADFootprintGeometry;
	/** 引脚定义列表 */
	pins: ECADPin[];
	/** 热属性（可选） */
	thermalProperties?: ECADThermalProperties;
	/** 电气值属性（可选） */
	valueProperties?: ECADValueProperties;
	/** 3D模型ID */
	model3dId?: string;
}

/**
 * 封装几何信息
 *
 * @remarks
 * 定义封装的外形、禁布区和标识信息。
 */
export interface ECADFootprintGeometry {
	/** 封装外形轮廓（闭合轮廓） */
	outline: ECADClosedGeometry;
	/** 禁布区列表（可选），定义元件周围不可放置其他元件的区域 */
	courtyards?: ECADClosedGeometry[];
	/** 丝印图形列表（可选），用于元件标识 */
	silkscreen?: ECADGeometry[];
}

/**
 * 封装引脚定义
 *
 * @remarks
 * 定义封装的电气连接点。
 * REF: Section 6.2.1.5
 */
export interface ECADPin {
	/** 引脚编号（如"1"、"A1"、"B+"等） */
	pinNumber: string;
	/** 是否为主引脚（引脚1），用于元件方向识别 */
	primary: boolean;
	/** 引脚中心位置（相对于封装原点） */
	position: Vector2;
	/** 引脚几何形状（可选），定义焊盘形状 */
	geometry?: ECADClosedGeometry;
	/** 网络名称（可选），用于电气连接信息 */
	netName?: string;
}

/**
 * 热属性定义
 *
 * @remarks
 * 定义元件的热特性，用于热分析和散热设计。
 * REF: Section 6.2.1.6
 */
export interface ECADThermalProperties {
	/** 最大功耗（瓦特） */
	powerMax?: number;
	/** 工作功耗（瓦特） */
	powerOp?: number;
	/** 热导率（瓦特/米·开尔文） */
	thermalCond?: number;
	/** 结到板热阻（摄氏度/瓦特） */
	thetaJB?: number;
	/** 结到壳热阻（摄氏度/瓦特） */
	thetaJC?: number;
}

/**
 * 电气值属性定义
 *
 * @remarks
 * 定义元件的电气参数，如电阻、电容值等。
 * REF: Section 6.2.1.7
 */
export interface ECADValueProperties {
	/** 电阻值（欧姆） */
	resistance?: number;
	/** 电容值（法拉） */
	capacitance?: number;
	/** 电感值（亨利） */
	inductance?: number;
	/** 容差（百分比） */
	tolerance?: number;
}

/**
 * 元件实例定义
 *
 * @remarks
 * 定义放置在PCB上的具体元件实例。
 * 每个实例引用一个封装定义，并具有特定的位置和方向。
 */
export interface ECADComponent extends ECADObject {
	/** 元件位号（如"R1"、"C5"、"U3"） */
	refDes: string;
	/** 引用的封装ID */
	footprintId: string;

	/** 2D变换信息，定义元件在板上的位置和方向 */
	transformation: ECADTransformation2D;

	/** 装配参考（层或层堆叠名称），定义元件在Z轴的位置 */
	assembleTo: string;
	/** Z轴偏移（可选），定义相对于参考面的偏移量 */
	zOffset?: number;

	/** 3D模型ID（可选） */
	model3dId?: string;

	/** 元件值（可选），如"10k"、"0.1uF"、"74HC00" */
	value?: string;
	/** 元件料号（可选） */
	partNumber?: string;
}

/**
 * 2D变换定义
 *
 * @remarks
 * 定义对象在二维平面中的位置、旋转和镜像变换。
 * 对应于IDX中的EDMDTransformation(d2类型)。
 */
export interface ECADTransformation2D {
	/** 位置坐标（相对于参考坐标系） */
	position: Vector2;
	/** 旋转角度（弧度），0表示无旋转 */
	rotation: number;
	/** 镜像标志（可选），true表示镜像（常用于底层元件） */
	mirror?: boolean;
}

/**
 * 孔/过孔定义
 *
 * @remarks
 * 定义PCB上的钻孔或过孔，可以是电镀或非电镀类型。
 * REF: Section 6.3
 */
export interface ECADHole extends ECADObject {
	/** 孔几何形状（闭合轮廓） */
	geometry: ECADClosedGeometry;
	/** 孔类型 */
	type: ECADHoleType;

	/** 层跨度定义方式一：指定起始和结束层 */
	layerSpan?: {
		/** 起始层ID或名称 */
		startLayer: string;
		/** 结束层ID或名称 */
		endLayer: string;
	};

	/** 层跨度定义方式二：引用层堆叠 */
	stackupId?: string;

	/** 层跨度定义方式三：直接指定Z轴范围 */
	zRange?: ECADZRange;

	/** 是否为铣削孔标志（可选） */
	isMilled?: boolean;
	/** 铣削直径（可选，仅当isMilled为true时有效） */
	millDiameter?: number;
	/** 焊盘堆叠名称（可选），用于引用标准孔定义 */
	padstackName?: string;
}

/**
 * 孔类型枚举
 *
 * @remarks
 * 定义不同类型的钻孔和过孔。
 */
export type ECADHoleType =
	/** 电镀通孔 */
	| 'PTH'
	/** 非电镀通孔 */
	| 'NPTH'
	/** 过孔（电镀，用于层间连接） */
	| 'VIA'
	/** 填充过孔 */
	| 'FILLED_VIA'
	/** 盲孔（从外层到内层） */
	| 'BLIND'
	/** 埋孔（内层到内层） */
	| 'BURIED';

/**
 * 约束区域定义
 *
 * @remarks
 * 定义PCB上的禁布区或保持区约束。
 * 禁布区：禁止特定类型元素放置的区域。
 * 保持区：要求特定类型元素必须保持在内部的区域。
 * REF: Section 6.5
 */
export interface ECADConstraintArea extends ECADObject {
	/** 约束类型 */
	type: 'KEEPOUT' | 'KEEPIN';
	/** 约束目的，定义受约束的元素类型 */
	purpose: ECADConstraintPurpose;
	/** 约束区域几何形状（闭合轮廓） */
	geometry: ECADClosedGeometry;
	/** 装配参考（层或层堆叠名称，可选） */
	assembleTo?: string;
	/** Z轴范围（可选），定义约束在垂直方向上的作用范围 */
	zRange?: ECADZRange;
}

/**
 * 约束目的枚举
 *
 * @remarks
 * 定义约束区域的具体用途。
 */
export type ECADConstraintPurpose =
	/** 布线约束 */
	| 'ROUTE'
	/** 元件放置约束 */
	| 'COMPONENT'
	/** 过孔放置约束 */
	| 'VIA'
	/** 测试点约束 */
	| 'TESTPOINT'
	/** 热约束 */
	| 'THERMAL'
	/** 其他约束 */
	| 'OTHER';

/**
 * Z轴范围定义
 *
 * @remarks
 * 定义对象在垂直方向上的作用范围。
 * 未定义的边界表示无穷大。
 */
export interface ECADZRange {
	/** Z轴下边界（可选），undefined表示负无穷 */
	lowerBound?: number;
	/** Z轴上边界（可选），undefined表示正无穷 */
	upperBound?: number;
}

/**
 * 非协作数据定义
 *
 * @remarks
 * 包含不需要在ECAD/MCAD之间协作的设计数据，
 * 如详细的走线、铜皮、丝印等。
 * 这些数据通常由ECAD系统提供给MCAD系统作为参考。
 */
export interface ECADNonCollaborativeData {
	/** 走线列表（可选） */
	traces?: ECADTrace[];
	/** 铜皮区域列表（可选） */
	copperAreas?: ECADCopperArea[];
	/** 丝印图形列表（可选） */
	silkscreen?: ECADSilkscreen[];
}

/**
 * 走线定义
 *
 * @remarks
 * 定义电气连接走线的几何信息。
 */
export interface ECADTrace {
	/** 所在层 */
	layer: string;
	/** 走线路径几何 */
	geometry: ECADOpenGeometry;
	/** 走线宽度 */
	width: number;
	/** 网络名称（可选） */
	netName?: string;
}

/**
 * 铜皮区域定义
 *
 * @remarks
 * 定义铜皮填充区域的几何信息。
 */
export interface ECADCopperArea {
	/** 所在层 */
	layer: string;
	/** 区域几何形状（闭合轮廓） */
	geometry: ECADClosedGeometry;
	/** 是否为电源/地层标志（可选） */
	isPlane?: boolean;
}

/**
 * 丝印图形定义
 *
 * @remarks
 * 定义丝印层的图形和文字信息。
 */
export interface ECADSilkscreen {
	/** 所在层 */
	layer: string;
	/** 图形几何 */
	geometry: ECADGeometry;
	/** 文字内容（可选，当geometry表示文字时） */
	text?: string;
}

/**
 * ECAD元数据定义
 *
 * @remarks
 * 包含设计的全局信息和创建上下文。
 * REF: Section 5.1, 5.3
 */
export interface ECADMeta {
	/** 设计名称 */
	designName: string;
	/** 设计版本/修订 */
	revision: string;

	/** 创建者信息 */
	creator: ECADCreatorInfo;

	/** 时间戳信息（必须），用于IDX文件版本控制 */
	timestamps: ECADTimestamps;

	/** 全局单位，决定所有尺寸的度量单位 */
	globalUnit: GlobalUnit;

	/** 设计描述（可选） */
	description?: string;
	/** 项目ID（可选） */
	projectId?: string;
}

/**
 * 创建者信息
 */
export interface ECADCreatorInfo {
	/** 设计者姓名 */
	name: string;
	/** 公司名称 */
	company: string;
	/** ECAD系统名称 */
	system: string;
	/** ECAD系统版本 */
	version: string;
}

/**
 * 时间戳信息
 *
 * @remarks
 * 必须包含创建时间，修改时间为可选。
 * 使用ISO 8601格式，推荐包含时区信息。
 * REF: Section 5.3
 */
export interface ECADTimestamps {
	/** 创建时间，ISO 8601格式（如"2024-01-20T10:30:00Z"） */
	created: string;
	/** 最后修改时间（可选） */
	modified?: string;
}
