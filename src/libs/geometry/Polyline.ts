import { Arc } from './Arc';
import { BBox2 } from './BBox2';
import { Geometry2D, GeometryType } from './Geometry2D';
import { Line } from './Line';
import { Matrix3 } from './Matrix3';
import { Vector2 } from './Vector2';

/** 折线 */
export class Polyline extends Geometry2D {
	readonly type = GeometryType.Polyline;
	/** 连续的几何图元集合 */
	readonly primitives: Geometry2D[];

	constructor(primitives: Geometry2D[]) {
		super();
		this.primitives = primitives;
	}

	/** 顶点数组 */
	get vertices(): Vector2[] {
		const vertices: Vector2[] = [];

		for (const primitive of this.primitives) {
			if (primitive instanceof Line) {
				if (vertices.length === 0) {
					vertices.push(
						primitive.start
					);
				}
				vertices.push(primitive.end);
			} else if (primitive instanceof Arc) {
				// 对圆弧进行离散化
				const arc = primitive;
				const segments = Math.ceil(
					Math.abs(arc.sweepAngle) /
						(Math.PI /
							12)
				); // 每15度一个点
				for (let i = 0; i <= segments; i++) {
					const t = i / segments;
					const angle =
						arc.startAngle +
						arc.sweepAngle *
							t;
					vertices.push(
						arc.getPointAtAngle(
							angle
						)
					);
				}
			}
		}

		return vertices;
	}

	/** 是否闭合 */
	get isClosed(): boolean {
		if (this.primitives.length === 0) return false;

		const firstPrimitive = this.primitives[0];
		const lastPrimitive = this.primitives[this.primitives.length - 1];

		let firstPoint: Vector2;
		let lastPoint: Vector2;

		if (firstPrimitive instanceof Line) {
			firstPoint = firstPrimitive.start;
		} else if (firstPrimitive instanceof Arc) {
			firstPoint = firstPrimitive.startPoint;
		} else {
			return false;
		}

		if (lastPrimitive instanceof Line) {
			lastPoint = lastPrimitive.end;
		} else if (lastPrimitive instanceof Arc) {
			lastPoint = lastPrimitive.endPoint;
		} else {
			return false;
		}

		return firstPoint.equals(lastPoint, 1e-10);
	}

	protected calculateBounds(): BBox2 {
		const bboxes = this.primitives.map(prim => prim.bounds);
		return BBox2.combine(bboxes);
	}

	transform(matrix: Matrix3): Polyline {
		const transformedPrimitives = this.primitives.map(prim => prim.transform(matrix) as Geometry2D);
		return new Polyline(transformedPrimitives);
	}

	clone(): Polyline {
		const clonedPrimitives = this.primitives.map(prim => prim.clone());
		return new Polyline(clonedPrimitives);
	}

	equals(other: Geometry2D, epsilon: number = 1e-10): boolean {
		if (!(other instanceof Polyline)) return false;
		if (this.primitives.length !== other.primitives.length) return false;

		for (let i = 0; i < this.primitives.length; i++) {
			const g1 = this.primitives[i];
			const g2 = other.primitives[i];
			if (!g1 || !g2) {
				if (g1 || g2) {
					return false;
				}
				continue;
			}
			if (!g1.equals(g2, epsilon)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 添加图元
	 */
	addPrimitive(primitive: Geometry2D): Polyline {
		return new Polyline([...this.primitives, primitive]);
	}

	/**
	 * 反转折线方向
	 */
	reverse(): Polyline {
		const reversedPrimitives: Geometry2D[] = [];

		for (let i = this.primitives.length - 1; i >= 0; i--) {
			const primitive = this.primitives[i];

			if (primitive instanceof Line) {
				reversedPrimitives.push(
					new Line(
						primitive.end,
						primitive.start
					)
				);
			} else if (primitive instanceof Arc) {
				reversedPrimitives.push(
					new Arc(
						primitive.radiusX,
						primitive.radiusY,
						primitive.center,
						primitive.endAngle,
						-primitive.sweepAngle
					)
				);
			}
		}

		return new Polyline(reversedPrimitives);
	}

	/**
	 * 获取长度
	 */
	getLength(): number {
		return this.primitives.reduce((total, primitive) => {
			if (primitive instanceof Line) {
				return total + primitive.length;
			} else if (primitive instanceof Arc) {
				// 圆弧长度近似计算
				const arc = primitive;
				return (
					total +
					Math.sqrt(
						arc.radiusX *
							arc.radiusX +
							arc.radiusY *
								arc.radiusY
					) *
						Math.abs(
							arc.sweepAngle
						)
				);
			}
			return total;
		}, 0);
	}
}
