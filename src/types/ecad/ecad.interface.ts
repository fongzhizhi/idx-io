import { Arc } from '../../libs/geometry/Arc';
import { BBox2 } from '../../libs/geometry/BBox2';
import { Line } from '../../libs/geometry/Line';
import { Polyline } from '../../libs/geometry/Polyline';
import { Vector2 } from '../../libs/geometry/Vector2';
import { EDMDIdentifier, EDMDUserSimpleProperty, RoleOnItemInstance } from '../core/base.types';

/** ECAD 系统数据 */
export interface ECADData {
	/** 物理堆叠层信息 */
	stackingLayers?: ECADStackingLayer[];
	/** PCB板基本信息 */
	board: ECADBoard;
	/** 封装列表 */
	footprints?: ECADFootprint[];
	/** 元件列表 */
	components: ECADComponent[];
	/** 钻孔列表 */
	holes: ECADHole[];
	/** 禁布区/保持区 */
	keepouts: ECADKeepout[];
	/** 元数据 */
	metadata: ECADMeta;
}

/** ECAD 物理堆叠层 */
export interface ECADStackingLayer {
	/** 层名称(唯一) */
	name: string;
	/** 层类型 */
	type: 'SIGNAL' | 'POWER' | 'GROUND' | 'SOLDERMASK' | 'SILKSCREEN';
	/** ?? */
	material?: string;
	/** 层厚度 */
	thickness: number;
	/** 层在堆叠中的顺序 */
	sequence: number;
}

/**
 * ECAD 对象基接口
 * @description 所有 ECAD 对象的基础数据接口
 */
export interface ECADObject {
	/** 对象名称 */
	name?: string;
	/** 对象描述 */
	description?: string;
	/** 对象属性是否已变更 */
	isAttrChanged?: boolean;
	/** 项目唯一标识符 */
	identifier?: EDMDIdentifier;
	/** 基线标识 */
	baseLine?: boolean;
	/** 用户自定义属性 */
	userProperties?: EDMDUserSimpleProperty[];
	/** 角色和权限信息 */
	roles?: RoleOnItemInstance[];
}

/** ECAD 板子 */
export interface ECADBoard extends ECADObject {
	/** 几何描述 */
	geometry: Polyline;
	/** 厚度(如果有, 以物理堆叠配置为准) */
	thickness?: number;
}

/** ECAD 封装 */
export interface ECADFootprint extends ECADObject {
	/** 唯一标识 */
	id: string;
	/** 封装名 */
	name: string;
	/** 几何描述 */
	geometry: Polyline | Arc;
	/** 引脚描述 */
	pins: ECADPin[];
}

/** ECAD 封装引脚 */
export interface ECADPin {
	/** 引脚编号 */
	pinNumber: string;
	/** 是否为主引脚（引脚1） */
	primary: boolean;
	/** 引脚位置点 */
	position: Vector2;
	/** 引脚几何描述 */
	geometry?: Line | Arc | Polyline;
}

/** ECAD 组件 */
export interface ECADComponent extends ECADObject {
	/** 位号 */
	refDes: string;
	/** 封装ID */
	packageId?: string;
	/** 坐标 */
	position: Vector2;
	/** 旋转角度 */
	rotation: number;
	/** 层类型 */
	side: 'TOP' | 'BOTTOM';
	/** 3D模型信息 */
	model3d?: ECADModel3D;
	/** 边界框(无封装时, 根据此信息生成封装) */
	bbox?: BBox2;
}

/** ECAD 3D模型 */
export interface ECADModel3D {
	path: string;
	format: 'STEP' | 'STL' | 'IGES';
	transformation?: Matrix4;
}

/** ECAD 过孔 */
export interface ECADHole extends ECADObject {
	/** 几何描述(圆) */
	geometry: Arc;
	/** 类型 */
	type: 'PTH' | 'NPTH' | 'VIA'; // 电镀/非电镀/过孔
	/** 起始层名称 */
	startLayer?: string;
	/** 终止层名称 */
	endLayer?: string;
	/** 下界(未指定起始层时，使用次数据)  */
	lowerBound?: number;
	/** 上界(未指定终止层时, 使用次数据)  */
	upperBound?: number;
}

/** ECAD 禁止区 */
export interface ECADKeepout extends ECADObject {
	/** 层名称 */
	layer?: string;
	/** 禁止类型 */
	type: 'ROUTE' | 'COMPONENT' | 'VIA';
	/** 几何描述 */
	geometry: Arc | Polyline;
	/** 下界(未指定层时，使用次数据)  */
	lowerBound?: number;
	/** 上界(未指定层时, 使用次数据)  */
	upperBound?: number;
}

/** ECAD 元数据 */
export interface ECADMeta {
	designName: string;
	revision: string;
	designer: string;
	company: string;
	createdDate: string;
}
