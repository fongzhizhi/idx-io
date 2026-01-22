import { iterateArr } from '../../utils/array.utils';
import { Arc } from './Arc';
import { BBox2 } from './BBox2';
import { Circle } from './Circle';
import { Geometry2D, GeometryType } from './Geometry2D';
import { Line } from './Line';
import { Matrix3 } from './Matrix3';
import { Vector2 } from './Vector2';

/**
 * 复合曲线
 * @description Line和Arc拼接轮廓
 */
export class Polyline extends Geometry2D {
	readonly type = GeometryType.Polyline;

	/** 连续的几何图元集合 */
	readonly primitives: readonly (Line | Arc)[];

	constructor(primitives: (Line | Arc)[]) {
		super();
		// 使用slice创建不可变副本
		this.primitives = primitives.slice();
	}

	/** 判断复合曲线是否包含Arc */
	get isContainArc(): boolean {
		return this.iteratePrimitives(item => {
			return item instanceof Arc;
		}) as boolean;
	}

	/** 遍历内部几何 */
	iteratePrimitives(cb: (item: Line | Arc, index: number) => boolean | void): boolean {
		return iterateArr(this.primitives as any[], cb);
	}

	/**
	 * 根据点数组创建折线
	 * @param points 点数组
	 * @param tolerance 容差值，小于此值的点视为重合
	 * @param closePath 是否闭合路径（首尾连接）
	 * @returns 创建的折线
	 */
	static fromPoints(points: readonly Vector2[], tolerance: number = 1e-10, closePath: boolean = false): Polyline {
		if (points.length < 2) {
			throw new Error('At least 2 points are required to create a polyline');
		}

		// 去重处理
		const uniquePoints = this.removeDuplicatePoints(points, tolerance);

		if (uniquePoints.length < 2) {
			throw new Error(
				'After removing duplicates, less than 2 unique points remain'
			);
		}

		// 创建线段
		const primitives: Line[] = [];

		for (let i = 0; i < uniquePoints.length - 1; i++) {
			const currentPoint = uniquePoints[i];
			const nextPoint = uniquePoints[i + 1];

			if (currentPoint && nextPoint) {
				primitives.push(new Line(currentPoint, nextPoint));
			}
		}

		// 如果要求闭合路径且首尾点不重合，添加闭合线段
		if (closePath && uniquePoints.length > 1) {
			const firstPoint = uniquePoints[0];
			const lastPoint = uniquePoints[uniquePoints.length - 1];

			if (firstPoint && lastPoint) {
				// 检查首尾点是否重合（考虑容差）
				if (firstPoint.distanceTo(lastPoint) > tolerance) {
					primitives.push(
						new Line(
							lastPoint,
							firstPoint
						)
					);
				}
				// 如果首尾点已经重合，则已经是闭合路径
			}
		}

		return new Polyline(primitives);
	}

	/**
	 * 移除重复的点
	 * @param points 原始点数组
	 * @param tolerance 容差值
	 * @returns 去重后的点数组
	 */
	private static removeDuplicatePoints(points: readonly Vector2[], tolerance: number = 1e-10): Vector2[] {
		if (points.length === 0) {
			return [];
		}

		const uniquePoints: Vector2[] = [];
		const firstPoint = points[0];

		if (firstPoint) {
			uniquePoints.push(firstPoint.clone());
		}

		for (let i = 1; i < points.length; i++) {
			const currentPoint = points[i];
			const lastUniquePoint = uniquePoints[uniquePoints.length - 1];

			if (currentPoint && lastUniquePoint) {
				// 如果当前点与上一个不重复点距离大于容差，则添加
				if (
					currentPoint.distanceTo(
						lastUniquePoint
					) > tolerance
				) {
					uniquePoints.push(
						currentPoint.clone()
					);
				}
				// 否则，跳过当前点（视为重复）
			}
		}

		return uniquePoints;
	}

	/**
	 * 根据点数组和圆角半径创建带圆角的折线
	 * @param points 点数组
	 * @param filletRadius 圆角半径
	 * @param tolerance 容差值
	 * @returns 创建的折线（包含直线段和圆弧）
	 */
	static fromPointsWithFillet(points: readonly Vector2[], filletRadius: number, tolerance: number = 1e-10): Polyline {
		if (points.length < 3) {
			// 少于3个点，无法创建圆角，直接创建普通折线
			return this.fromPoints(points, tolerance, false);
		}

		// 去重处理
		const uniquePoints = this.removeDuplicatePoints(points, tolerance);

		if (uniquePoints.length < 3) {
			throw new Error(
				'At least 3 unique points are required to create a filleted polyline'
			);
		}

		const primitives: (Line | Arc)[] = [];

		for (let i = 0; i < uniquePoints.length; i++) {
			const prevPoint = i > 0 ? uniquePoints[i - 1] : null;
			const currentPoint = uniquePoints[i];
			const nextPoint = i < uniquePoints.length - 1 ? uniquePoints[i + 1] : null;

			if (!currentPoint || !prevPoint || !nextPoint) {
				// 第一个点和最后一个点，只有一侧有相邻点
				continue;
			}

			// 计算方向向量
			const inVector = currentPoint.subtract(prevPoint);
			const outVector = nextPoint.subtract(currentPoint);

			// 计算线段长度
			const inLength = inVector.length;
			const outLength = outVector.length;

			// 归一化方向向量
			const inDir = inVector.normalized;
			const outDir = outVector.normalized;

			// 计算夹角（使用点积）
			const cosAngle = inDir.dot(outDir);
			const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

			// 如果夹角接近0度或180度，则不需要创建圆角
			if (angle < tolerance || Math.abs(angle - Math.PI) < tolerance) {
				// 继续使用直线连接
				continue;
			}

			// 检查圆角半径是否适合当前线段长度
			const halfAngle = angle / 2;
			const tangentLength = filletRadius / Math.tan(halfAngle);

			if (tangentLength * 2 > inLength || tangentLength * 2 > outLength) {
				// 圆角半径太大，无法创建，使用直线连接
				continue;
			}

			// 计算圆角的起点和终点
			const filletStart = currentPoint.subtract(inDir.multiply(tangentLength));
			const filletEnd = currentPoint.add(outDir.multiply(tangentLength));

			// 添加前一段直线（如果有）
			if (i === 1) {
				// 第一个角点，添加从起点到圆角起点的直线
				const startPoint = uniquePoints[0];
				if (startPoint) {
					primitives.push(
						new Line(
							startPoint,
							filletStart
						)
					);
				}
			} else if (i > 1) {
				// 中间的角点，添加从前一个圆角终点到当前圆角起点的直线
				const lastPrimitive =
					primitives[
						primitives.length -
							1
					];
				if (lastPrimitive instanceof Arc) {
					primitives.push(
						new Line(
							lastPrimitive.endPoint,
							filletStart
						)
					);
				}
			}

			// 计算圆心
			const distanceToCenter = filletRadius / Math.sin(halfAngle);
			const bisectorDir = inDir.add(outDir).normalized;
			const center = currentPoint.subtract(bisectorDir.multiply(distanceToCenter));

			// 计算圆弧的起始角度和扫描角度
			const startAngle = Math.atan2(
				filletStart.y - center.y,
				filletStart.x - center.x
			);
			const endAngle = Math.atan2(filletEnd.y - center.y, filletEnd.x - center.x);

			// 确保扫描方向正确
			let sweepAngle = endAngle - startAngle;
			const crossProduct = inDir.cross(outDir);

			// 根据叉积符号决定圆弧方向
			if (crossProduct < 0) {
				// 顺时针
				if (sweepAngle > 0) {
					sweepAngle -= 2 * Math.PI;
				}
			} else {
				// 逆时针
				if (sweepAngle < 0) {
					sweepAngle += 2 * Math.PI;
				}
			}

			// 创建圆弧
			primitives.push(
				new Arc(
					filletRadius,
					filletRadius,
					center,
					startAngle,
					sweepAngle
				)
			);

			// 如果是最后一个角点，添加圆角终点到终点的直线
			if (i === uniquePoints.length - 2) {
				const endPoint =
					uniquePoints[
						uniquePoints.length -
							1
					];
				if (endPoint) {
					primitives.push(
						new Line(
							filletEnd,
							endPoint
						)
					);
				}
			}
		}

		// 如果没有创建任何圆角，则创建普通折线
		if (primitives.length === 0) {
			return this.fromPoints(points, tolerance, false);
		}

		return new Polyline(primitives);
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
		if (this.primitives.length === 0) {
			return false;
		}

		const firstPrimitive = this.primitives[0];
		const lastPrimitive = this.primitives[this.primitives.length - 1];

		if (!firstPrimitive || !lastPrimitive) {
			return false;
		}

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
		if (this.primitives.length === 0) {
			return BBox2.EMPTY;
		}

		const bboxes = this.primitives.map(prim => prim.bounds);
		return BBox2.combine(bboxes);
	}

	transform(matrix: Matrix3): Polyline {
		const transformedPrimitives = this.primitives.map(prim => prim.transform(matrix) as Line | Arc);
		return new Polyline(transformedPrimitives);
	}

	clone(): Polyline {
		const clonedPrimitives = this.primitives.map(prim => prim.clone() as Line | Arc);
		return new Polyline(clonedPrimitives);
	}

	equals(other: Geometry2D, epsilon: number = 1e-10): boolean {
		if (!(other instanceof Polyline)) {
			return false;
		}

		if (this.primitives.length !== other.primitives.length) {
			return false;
		}

		for (let i = 0; i < this.primitives.length; i++) {
			const thisPrimitive = this.primitives[i];
			const otherPrimitive = other.primitives[i];

			if (thisPrimitive && otherPrimitive) {
				if (!thisPrimitive.equals(otherPrimitive, epsilon)) {
					return false;
				}
			} else if (thisPrimitive !== otherPrimitive) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 简化折线：移除冗余点
	 * @param tolerance 容差值，小于此值的点视为重合
	 * @returns 简化后的折线
	 */
	simplify(tolerance: number = 1e-10): Polyline {
		// 获取所有顶点
		const vertices = this.vertices;

		if (vertices.length <= 2) {
			return this.clone();
		}

		// 使用Douglas-Peucker算法简化折线
		const simplifiedVertices = this.douglasPeucker(vertices, tolerance);

		// 重新创建折线
		return Polyline.fromPoints(simplifiedVertices, tolerance, this.isClosed);
	}

	/**
	 * Douglas-Peucker算法实现
	 */
	private douglasPeucker(points: Vector2[], tolerance: number): Vector2[] {
		if (points.length <= 2) {
			return points.map(p => p.clone());
		}

		// 找到距离首尾连线最远的点
		let maxDistance = 0;
		let maxIndex = 0;

		const firstPoint = points[0];
		const lastPoint = points[points.length - 1];

		if (!firstPoint || !lastPoint) {
			return points.map(p => p.clone());
		}

		for (let i = 1; i < points.length - 1; i++) {
			const point = points[i];
			if (point) {
				const distance = this.pointToLineDistance(
					point,
					firstPoint,
					lastPoint
				);
				if (distance > maxDistance) {
					maxDistance = distance;
					maxIndex = i;
				}
			}
		}

		// 如果最大距离大于容差，则递归处理
		if (maxDistance > tolerance) {
			// 递归处理左右两部分
			const leftPart = this.douglasPeucker(
				points.slice(0, maxIndex + 1),
				tolerance
			);
			const rightPart = this.douglasPeucker(points.slice(maxIndex), tolerance);

			// 合并结果，注意避免重复中间点
			return leftPart.slice(0, -1).concat(rightPart);
		} else {
			// 所有点都在容差范围内，只保留首尾点
			return [firstPoint.clone(), lastPoint.clone()];
		}
	}

	/**
	 * 计算点到线段的距离
	 */
	private pointToLineDistance(point: Vector2, lineStart: Vector2, lineEnd: Vector2): number {
		const line = new Line(lineStart, lineEnd);
		return line.distanceToPoint(point);
	}

	/**
	 * 添加图元
	 */
	addPrimitive(primitive: Line | Arc): Polyline {
		return new Polyline([...this.primitives, primitive]);
	}

	/**
	 * 添加点（自动创建线段连接到上一个点）
	 */
	addPoint(point: Vector2): Polyline {
		if (this.primitives.length === 0) {
			// 第一个点，无法创建线段，返回原始折线
			return this;
		}

		// 获取最后一个图元的终点
		const lastPrimitive = this.primitives[this.primitives.length - 1];
		if (!lastPrimitive) {
			return this;
		}

		let lastPoint: Vector2;

		if (lastPrimitive instanceof Line) {
			lastPoint = lastPrimitive.end;
		} else if (lastPrimitive instanceof Arc) {
			lastPoint = lastPrimitive.endPoint;
		} else {
			throw new Error('Unsupported primitive type');
		}

		// 创建新线段
		const newLine = new Line(lastPoint, point);

		return new Polyline([...this.primitives, newLine]);
	}

	/**
	 * 闭合折线（如果尚未闭合）
	 */
	close(): Polyline {
		if (this.isClosed) {
			return this.clone();
		}

		if (this.primitives.length === 0) {
			return this;
		}

		const firstPrimitive = this.primitives[0];
		const lastPrimitive = this.primitives[this.primitives.length - 1];

		if (!firstPrimitive || !lastPrimitive) {
			return this;
		}

		let firstPoint: Vector2;
		let lastPoint: Vector2;

		if (firstPrimitive instanceof Line) {
			firstPoint = firstPrimitive.start;
		} else if (firstPrimitive instanceof Arc) {
			firstPoint = firstPrimitive.startPoint;
		} else {
			return this;
		}

		if (lastPrimitive instanceof Line) {
			lastPoint = lastPrimitive.end;
		} else if (lastPrimitive instanceof Arc) {
			lastPoint = lastPrimitive.endPoint;
		} else {
			return this;
		}

		// 如果首尾点不重合，添加闭合线段
		if (!firstPoint.equals(lastPoint, 1e-10)) {
			const closingLine = new Line(lastPoint, firstPoint);
			return new Polyline([...this.primitives, closingLine]);
		}

		return this.clone();
	}

	/**
	 * 反转折线方向
	 */
	reverse(): Polyline {
		const reversedPrimitives: (Line | Arc)[] = [];

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
				return total + arc.length;
			}
			return total;
		}, 0);
	}

	/**
	 * 获取折线在参数t处的点
	 * @param t 参数，0 <= t <= 1
	 */
	getPointAtParameter(t: number): Vector2 {
		if (t < 0 || t > 1) {
			throw new Error('Parameter t must be between 0 and 1');
		}

		if (this.primitives.length === 0) {
			throw new Error('Polyline has no primitives');
		}

		const totalLength = this.getLength();
		const targetLength = totalLength * t;

		let accumulatedLength = 0;

		for (const primitive of this.primitives) {
			let primitiveLength: number;

			if (primitive instanceof Line) {
				primitiveLength = primitive.length;
			} else if (primitive instanceof Arc) {
				primitiveLength = primitive.length;
			} else {
				primitiveLength = 0;
			}

			if (accumulatedLength + primitiveLength >= targetLength) {
				// 点在当前图元上
				const tInPrimitive =
					(targetLength -
						accumulatedLength) /
					primitiveLength;

				if (primitive instanceof Line) {
					return primitive.start.add(
						primitive.direction.multiply(
							tInPrimitive
						)
					);
				} else if (primitive instanceof Arc) {
					return primitive.getPointAtParameter(
						tInPrimitive
					);
				}
			}

			accumulatedLength += primitiveLength;
		}

		// 如果t=1，返回最后一个点
		const lastPrimitive = this.primitives[this.primitives.length - 1];
		if (lastPrimitive) {
			if (lastPrimitive instanceof Line) {
				return lastPrimitive.end;
			} else if (lastPrimitive instanceof Arc) {
				return lastPrimitive.endPoint;
			}
		}

		throw new Error('Failed to find point at parameter t');
	}

	/**
	 * 判断点是否在折线上（考虑容差）
	 */
	containsPoint(point: Vector2, tolerance: number = 1e-10): boolean {
		for (const primitive of this.primitives) {
			if (primitive instanceof Line) {
				const closestPoint = primitive.closestPoint(point);
				if (point.distanceTo(closestPoint) <= tolerance) {
					return true;
				}
			} else if (primitive instanceof Arc) {
				const distance = primitive.distanceToPoint(point);
				if (Math.abs(distance) <= tolerance) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * 获取折线的包围盒
	 */
	getBoundingBox(): BBox2 {
		return this.bounds;
	}

	/**
	 * 将折线转换为多边形（如果闭合）
	 */
	toPolygon(): Polyline | null {
		if (!this.isClosed) {
			return null;
		}

		return this.clone();
	}

	/**
	 * 获取所有线段
	 */
	getLines(): Line[] {
		return this.primitives.filter((prim): prim is Line => prim instanceof Line);
	}

	/**
	 * 获取所有圆弧
	 */
	getArcs(): Arc[] {
		return this.primitives.filter((prim): prim is Arc => prim instanceof Arc);
	}

	/**
	 * 判断是否包含圆弧
	 */
	containsArc(): boolean {
		return this.primitives.some(prim => prim instanceof Arc);
	}

	/**
	 * 获取折线的起点
	 */
	getStartPoint(): Vector2 | null {
		if (this.primitives.length === 0) {
			return null;
		}

		const firstPrimitive = this.primitives[0];
		if (!firstPrimitive) {
			return null;
		}

		if (firstPrimitive instanceof Line) {
			return firstPrimitive.start;
		} else if (firstPrimitive instanceof Arc) {
			return firstPrimitive.startPoint;
		}

		return null;
	}

	/**
	 * 获取折线的终点
	 */
	getEndPoint(): Vector2 | null {
		if (this.primitives.length === 0) {
			return null;
		}

		const lastPrimitive = this.primitives[this.primitives.length - 1];
		if (!lastPrimitive) {
			return null;
		}

		if (lastPrimitive instanceof Line) {
			return lastPrimitive.end;
		} else if (lastPrimitive instanceof Arc) {
			return lastPrimitive.endPoint;
		}

		return null;
	}

	/**
	 * 将折线转换为连续的点序列（用于导出或其他处理）
	 */
	toPointSequence(): Vector2[] {
		return this.vertices;
	}

	/**
	 * 字符串表示
	 */
	toString(): string {
		const lineCount = this.getLines().length;
		const arcCount = this.getArcs().length;

		return (
			`Polyline(primitives: ${this.primitives.length} ` +
			`[Lines: ${lineCount}, Arcs: ${arcCount}], ` +
			`closed: ${this.isClosed}, length: ${this.getLength().toFixed(2)})`
		);
	}
}
