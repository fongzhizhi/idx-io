import { IBoundingBox, BBox2 } from './BBox2';
import { Matrix3 } from './Matrix3';

/** 几何元素类型 */
export enum GeometryKind {
	/** 线段 */
	Line = 'line',
	/** 圆弧 */
	Arc = 'arc',
	/** 整圆 */
	Circle = 'circle',
	/** 矩形 */
	Rect = 'Rect',
	/** 复合曲线(曲线和直线拼接) */
	Polyline = 'polyline',
}

/** 几何基接口 */
export interface IGeometry {
	/** 几何类型 */
	readonly type: GeometryKind;
	/** 边界框 */
	readonly bounds: BBox2;
	/** 应用变换 */
	transform(matrix: Matrix3): IGeometry;
	/** 克隆 */
	clone(): IGeometry;
}

/** 2D几何基类 */
export abstract class Geometry2D implements IGeometry {
	abstract readonly type: GeometryKind;

	get bounds(): BBox2 {
		return this.calculateBounds();
	}

	/** 应用变换 */
	abstract transform(matrix: Matrix3): Geometry2D;

	/** 计算边界框 */
	protected abstract calculateBounds(): BBox2;

	/** 克隆 */
	abstract clone(): Geometry2D;

	/** 判断是否相等 */
	abstract equals(other: Geometry2D, epsilon?: number): boolean;
}
