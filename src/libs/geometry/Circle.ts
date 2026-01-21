import { BBox2 } from './BBox2';
import { Geometry2D, GeometryType } from './Geometry2D';
import { Matrix3 } from './Matrix3';
import { Vector2 } from './Vector2';

/** 整圆 */
export class Circle extends Geometry2D {
	readonly type = GeometryType.Circle;
	/** 圆心 */
	readonly center: Vector2;
	/** 半径 */
	readonly radius: number;

	/** 整圆 */
	constructor(center: Vector2, radius: number) {
		super();
		this.center = center;
		this.radius = radius;
	}
}
