import { EDMDObject } from './base.types';
import { StratumType, StratumSurfaceDesignation, ShapeElementType } from './enums';

// ============= 形状元素 =============

/**
 * 形状元素
 *
 * @remarks
 * 连接曲线集和项目定义的中介，支持布尔运算
 * REF: Section 4.1.2 (Table 2)
 * XML: <foundation:ShapeElement xsi:type="pdm:EDMDShapeElement">
 */
export interface EDMDShapeElement extends EDMDObject {
	/** 形状元素类型 */
	ShapeElementType: ShapeElementType;
	/** 布尔运算标记：false=添加材料，true=减去材料 */
	Inverted: boolean;
	/** 引用的曲线集id */
	DefiningShape: string;
}

// ============= 层定义（传统方式） =============

/**
 * 层次定义（传统方式）
 *
 * @remarks
 * 在传统IDX结构中用作"Third Item"，在简化方式中可省略
 * REF: Section 6.1.2.1
 */
export interface EDMDStratum extends EDMDObject {
	/** 引用的形状元素id列表 */
	ShapeElements: string[];
	/** 层类型 */
	StratumType: StratumType;
	/** 层表面指定 */
	StratumSurfaceDesignation?: StratumSurfaceDesignation;
	/** 层技术引用 */
	StratumTechnology?: string;
}
