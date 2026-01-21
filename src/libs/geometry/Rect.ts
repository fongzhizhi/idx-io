import { BBox2 } from './BBox2';
import { Geometry2D, GeometryType } from './Geometry2D';
import { Matrix3 } from './Matrix3';
import { Vector2 } from './Vector2';

/** 矩形 */
export class Rect extends Geometry2D {
	readonly type = GeometryType.Rect;
	/** 左下角 */
	readonly leftBottom: Vector2;
	/** 宽度 */
	readonly width: number;
	/** 高度 */
	readonly height: number;

	/** 整圆 */
	constructor(leftBottom: Vector2, width: number, height: number) {
		super();
		this.leftBottom = leftBottom;
		this.width = width;
		this.height = height;
	}
}
