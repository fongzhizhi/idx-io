import { BBox2 } from './BBox2';
import { Geometry2D, GeometryKind } from './Geometry2D';
import { Matrix3 } from './Matrix3';
import { Vector2 } from './Vector2';

/** 线条 */
export class Line extends Geometry2D {
	readonly type = GeometryKind.Line;

	readonly start: Vector2;
	readonly end: Vector2;

	constructor(start: Vector2, end: Vector2) {
		super();
		this.start = start;
		this.end = end;
	}

	/** 长度 */
	get length(): number {
		return this.start.distanceTo(this.end);
	}

	/** 方向向量 */
	get direction(): Vector2 {
		return this.end.subtract(this.start);
	}

	/** 单位方向向量 */
	get normalizedDirection(): Vector2 {
		return this.direction.normalized;
	}

	/** 中点 */
	get midpoint(): Vector2 {
		return Vector2.lerp(this.start, this.end, 0.5);
	}

	protected calculateBounds(): BBox2 {
		return BBox2.fromPoints([this.start, this.end]);
	}

	transform(matrix: Matrix3): Line {
		return new Line(matrix.transformVector(this.start), matrix.transformVector(this.end));
	}

	clone(): Line {
		return new Line(this.start.clone(), this.end.clone());
	}

	equals(other: Geometry2D, epsilon: number = 1e-10): boolean {
		if (!(other instanceof Line)) return false;
		return this.start.equals(other.start, epsilon) && this.end.equals(other.end, epsilon);
	}

	/**
	 * 点到直线的距离
	 */
	distanceToPoint(point: Vector2): number {
		const lineVec = this.direction;
		const pointVec = point.subtract(this.start);
		const cross = lineVec.cross(pointVec);
		return Math.abs(cross) / lineVec.length;
	}

	/**
	 * 线段上的最近点
	 */
	closestPoint(point: Vector2): Vector2 {
		const lineVec = this.direction;
		const pointVec = point.subtract(this.start);
		const lineLengthSq = lineVec.lengthSquared;

		if (lineLengthSq === 0) return this.start.clone();

		let t = pointVec.dot(lineVec) / lineLengthSq;
		t = Math.max(0, Math.min(1, t)); // 限制在线段范围内

		return this.start.add(lineVec.multiply(t));
	}
}
