import { iterateArr } from '../../utils/array.utils';
import { Angle } from './Angle';
import { BBox2 } from './BBox2';
import { Circle, CircleApproximationStrategy } from './Circle';
import { Geometry2D, GeometryKind } from './Geometry2D';
import { Line } from './Line';
import { Matrix3 } from './Matrix3';
import { Polyline } from './Polyline';
import { Vector2 } from './Vector2';

/** Arc 圆弧 */
export class Arc extends Geometry2D {
	readonly type = GeometryKind.Arc;

	readonly radiusX: number;
	readonly radiusY: number;
	readonly center: Vector2;
	readonly startAngle: number; // 弧度
	readonly sweepAngle: number; // 弧度

	constructor(radiusX: number, radiusY: number, center: Vector2, startAngle: number, sweepAngle: number) {
		super();

		if (radiusX <= 0 || radiusY <= 0) {
			throw new Error('Arc radii must be positive');
		}

		this.radiusX = radiusX;
		this.radiusY = radiusY;
		this.center = center;
		this.startAngle = Angle.normalizeRadians(startAngle);
		this.sweepAngle = sweepAngle;
	}

	/** 判断是否为完整的圆 */
	get isCircle(): boolean {
		return this.isFullCircle;
	}

	/** 是否为完整的圆 */
	get isFullCircle(): boolean {
		// 检查半径是否相等（考虑浮点误差）
		const isCircular = Math.abs(this.radiusX - this.radiusY) < 1e-10;
		// 检查是否是完整的360度（2π弧度）
		const isFullAngle = Math.abs(Math.abs(this.sweepAngle) - Angle.TWO_PI) < 1e-10;

		return isCircular && isFullAngle;
	}

	/** 结束角度 */
	get endAngle(): number {
		return Angle.normalizeRadians(this.startAngle + this.sweepAngle);
	}

	/** 起点 */
	get startPoint(): Vector2 {
		return new Vector2(
			this.center.x + Math.cos(this.startAngle) * this.radiusX,
			this.center.y + Math.sin(this.startAngle) * this.radiusY
		);
	}

	/** 终点 */
	get endPoint(): Vector2 {
		return new Vector2(
			this.center.x + Math.cos(this.endAngle) * this.radiusX,
			this.center.y + Math.sin(this.endAngle) * this.radiusY
		);
	}

	/** 圆弧轮廓上的中点 */
	get midPoint(): Vector2 {
		const midAngle = this.startAngle + this.sweepAngle / 2;
		return this.getPointAtAngle(midAngle);
	}

	/** 是否闭合（完整圆） */
	get isClosed(): boolean {
		return Math.abs(Math.abs(this.sweepAngle) - Angle.TWO_PI) < 1e-10;
	}

	/** 是否为逆时针方向 */
	get isCounterClockwise(): boolean {
		return this.sweepAngle > 0;
	}

	/** 圆弧长度 */
	get length(): number {
		// 对于椭圆弧，使用第二类不完全椭圆积分近似
		// 简化处理：使用平均半径近似计算
		if (Math.abs(this.radiusX - this.radiusY) < 1e-10) {
			// 圆弧（半径相等）
			return Math.abs(this.radiusX * this.sweepAngle);
		} else {
			// 椭圆弧，使用Ramanujan近似公式
			const a = Math.max(this.radiusX, this.radiusY);
			const b = Math.min(this.radiusX, this.radiusY);
			const h = Math.pow((a - b) / (a + b), 2);
			const avgCircumference =
				Math.PI *
				(a + b) *
				(1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
			return (avgCircumference * Math.abs(this.sweepAngle)) / (2 * Math.PI);
		}
	}

	/**
	 * 转换为Circle
	 * 注意：如果Arc不是完整的圆，这个方法会丢失角度信息
	 * 如果Arc是椭圆（radiusX ≠ radiusY），会使用平均半径
	 */
	toCircle(): Circle {
		// 使用平均半径
		const avgRadius = (this.radiusX + this.radiusY) / 2;
		return new Circle(this.center.clone(), avgRadius);
	}

	/**
	 * 安全转换为Circle（仅当是完整圆时）
	 * @throws 如果不是完整圆则抛出错误
	 */
	toCircleSafe(): Circle {
		if (!this.isFullCircle) {
			throw new Error('Cannot convert non-full circle arc to Circle');
		}

		// 完整圆，使用radiusX作为半径（两者相等）
		return new Circle(this.center.clone(), this.radiusX);
	}

	/**
	 * 尝试转换为Circle，如果成功则返回Circle，否则返回undefined
	 */
	tryToCircle(): Circle | undefined {
		if (this.isFullCircle) {
			return this.toCircleSafe();
		}
		return undefined;
	}

	/**
	 * 获取圆形近似（总是返回Circle，无论是否是完整圆）
	 * 可以选择不同的半径策略
	 */
	getCircleApproximation(strategy: CircleApproximationStrategy = 'average'): Circle {
		let radius: number;

		switch (strategy) {
			case 'min':
				radius = Math.min(this.radiusX, this.radiusY);
				break;
			case 'max':
				radius = Math.max(this.radiusX, this.radiusY);
				break;
			case 'average':
				radius = (this.radiusX + this.radiusY) / 2;
				break;
			case 'geometricMean':
				radius = Math.sqrt(this.radiusX * this.radiusY);
				break;
			case 'harmonicMean':
				radius =
					(2 *
						this
							.radiusX *
						this
							.radiusY) /
					(this.radiusX + this.radiusY);
				break;
			case 'areaEquivalent':
				// 面积相等的圆半径
				radius = Math.sqrt(this.radiusX * this.radiusY);
				break;
			case 'perimeterEquivalent':
				// 周长近似相等的圆半径
				const h = Math.pow(
					(this.radiusX -
						this
							.radiusY) /
						(this
							.radiusX +
							this
								.radiusY),
					2
				);
				radius =
					((this.radiusX +
						this
							.radiusY) *
						(1 +
							(3 *
								h) /
								(10 +
									Math.sqrt(
										4 -
											3 *
												h
									)))) /
					2;
				break;
			default:
				radius = (this.radiusX + this.radiusY) / 2;
		}

		return new Circle(this.center.clone(), radius);
	}

	protected calculateBounds(): BBox2 {
		// 获取圆弧的四个关键角度点
		const angles = [this.startAngle, this.endAngle];

		// 添加可能的极值点（0, π/2, π, 3π/2）
		const criticalAngles = [0, Angle.HALF_PI, Angle.PI, Angle.HALF_PI * 3];
		for (const angle of criticalAngles) {
			if (this.containsAngle(angle)) {
				angles.push(angle);
			}
		}

		const points = angles.map(
			angle =>
				new Vector2(
					this.center.x +
						Math.cos(
							angle
						) *
							this
								.radiusX,
					this.center.y +
						Math.sin(
							angle
						) *
							this
								.radiusY
				)
		);

		return BBox2.fromPoints(points);
	}

	transform(matrix: Matrix3): Arc {
		// 变换后的椭圆可能不再是标准椭圆，这里简化处理为近似椭圆
		const newCenter = matrix.transformVector(this.center);

		// 计算变换后的半径（近似）
		const scaleVec = new Vector2(matrix.iScale, matrix.jScale);
		const newRadiusX = this.radiusX * scaleVec.x;
		const newRadiusY = this.radiusY * scaleVec.y;

		// 计算变换后的角度
		const startVec = Vector2.fromPolar(this.startAngle, 1);
		const endVec = Vector2.fromPolar(this.endAngle, 1);

		const transformedStartVec = matrix.transformVector(startVec.add(this.center)).subtract(newCenter);
		const transformedEndVec = matrix.transformVector(endVec.add(this.center)).subtract(newCenter);

		const newStartAngle = Math.atan2(
			transformedStartVec.y / newRadiusY,
			transformedStartVec.x / newRadiusX
		);
		const newEndAngle = Math.atan2(transformedEndVec.y / newRadiusY, transformedEndVec.x / newRadiusX);

		return new Arc(newRadiusX, newRadiusY, newCenter, newStartAngle, newEndAngle - newStartAngle);
	}

	clone(): Arc {
		return new Arc(this.radiusX, this.radiusY, this.center.clone(), this.startAngle, this.sweepAngle);
	}

	equals(other: Geometry2D, epsilon: number = 1e-10): boolean {
		if (!(other instanceof Arc)) return false;
		return (
			Math.abs(this.radiusX - other.radiusX) < epsilon &&
			Math.abs(this.radiusY - other.radiusY) < epsilon &&
			this.center.equals(other.center, epsilon) &&
			Math.abs(this.startAngle - other.startAngle) < epsilon &&
			Math.abs(this.sweepAngle - other.sweepAngle) < epsilon
		);
	}

	/**
	 * 判断是否包含某个角度
	 */
	containsAngle(angle: number): boolean {
		const normalizedAngle = Angle.normalizeRadians(angle);
		const normalizedStart = this.startAngle;
		const normalizedEnd = Angle.normalizeRadians(this.endAngle);

		if (this.sweepAngle >= 0) {
			if (normalizedStart <= normalizedEnd) {
				return (
					normalizedAngle >=
						normalizedStart &&
					normalizedAngle <=
						normalizedEnd
				);
			} else {
				return (
					normalizedAngle >=
						normalizedStart ||
					normalizedAngle <=
						normalizedEnd
				);
			}
		} else {
			if (normalizedStart >= normalizedEnd) {
				return (
					normalizedAngle <=
						normalizedStart &&
					normalizedAngle >=
						normalizedEnd
				);
			} else {
				return (
					normalizedAngle <=
						normalizedStart ||
					normalizedAngle >=
						normalizedEnd
				);
			}
		}
	}

	/**
	 * 获取圆弧上的点
	 */
	getPointAtAngle(angle: number): Vector2 {
		return new Vector2(
			this.center.x + Math.cos(angle) * this.radiusX,
			this.center.y + Math.sin(angle) * this.radiusY
		);
	}

	/**
	 * 获取圆弧上的点（根据参数t，0<=t<=1）
	 */
	getPointAtParameter(t: number): Vector2 {
		const angle = this.startAngle + this.sweepAngle * t;
		return this.getPointAtAngle(angle);
	}

	/**
	 * 获取圆弧上的切线方向（单位向量）
	 */
	getTangentAtAngle(angle: number): Vector2 {
		// 椭圆在角度θ处的切线方向为 (-rx * sinθ, ry * cosθ)
		const tangent = new Vector2(-this.radiusX * Math.sin(angle), this.radiusY * Math.cos(angle));
		return tangent.normalized;
	}

	/**
	 * 获取圆弧在参数t处的切线方向
	 */
	getTangentAtParameter(t: number): Vector2 {
		const angle = this.startAngle + this.sweepAngle * t;
		return this.getTangentAtAngle(angle);
	}

	/**
	 * 分割圆弧
	 */
	split(angle: number): [Arc, Arc] {
		if (!this.containsAngle(angle)) {
			throw new Error('Split angle is not within the arc');
		}

		const firstSweep = Angle.normalizeRadians(angle - this.startAngle);
		const secondSweep = this.sweepAngle - firstSweep;

		return [
			new Arc(this.radiusX, this.radiusY, this.center, this.startAngle, firstSweep),
			new Arc(this.radiusX, this.radiusY, this.center, angle, secondSweep),
		];
	}

	/**
	 * 按参数t分割圆弧
	 */
	splitAtParameter(t: number): [Arc, Arc] {
		if (t <= 0 || t >= 1) {
			throw new Error('Split parameter must be between 0 and 1');
		}

		const splitAngle = this.startAngle + this.sweepAngle * t;
		return this.split(splitAngle);
	}

	/**
	 * 按中点分割圆弧
	 */
	splitAtMidpoint(): [Arc, Arc] {
		return this.splitAtParameter(0.5);
	}

	/**
	 * 计算点到圆弧的最近距离
	 */
	distanceToPoint(point: Vector2): number {
		// 先计算点到圆心的向量角度
		const dx = point.x - this.center.x;
		const dy = point.y - this.center.y;

		// 计算点在椭圆参数空间的角度
		let angle = Math.atan2(dy / this.radiusY, dx / this.radiusX);

		// 如果角度在圆弧范围内，计算椭圆上该角度的点
		if (this.containsAngle(angle)) {
			const closestPoint = this.getPointAtAngle(angle);
			return point.distanceTo(closestPoint);
		} else {
			// 否则，最近点是起点或终点
			const distToStart = point.distanceTo(this.startPoint);
			const distToEnd = point.distanceTo(this.endPoint);
			return Math.min(distToStart, distToEnd);
		}
	}

	/**
	 * 获取点到圆弧的最近点
	 */
	closestPoint(point: Vector2): Vector2 {
		// 先计算点到圆心的向量角度
		const dx = point.x - this.center.x;
		const dy = point.y - this.center.y;

		// 计算点在椭圆参数空间的角度
		let angle = Math.atan2(dy / this.radiusY, dx / this.radiusX);

		// 如果角度在圆弧范围内，返回椭圆上该角度的点
		if (this.containsAngle(angle)) {
			return this.getPointAtAngle(angle);
		} else {
			// 否则，最近点是起点或终点
			const distToStart = point.distanceSquaredTo(this.startPoint);
			const distToEnd = point.distanceSquaredTo(this.endPoint);
			return distToStart <= distToEnd
				? this.startPoint.clone()
				: this.endPoint.clone();
		}
	}

	/**
	 * 将圆弧离散化为点集
	 */
	discretize(maxAngleStep: number = Math.PI / 12): Vector2[] {
		const segments = Math.ceil(Math.abs(this.sweepAngle) / maxAngleStep);
		const points: Vector2[] = [];

		for (let i = 0; i <= segments; i++) {
			const t = i / segments;
			points.push(this.getPointAtParameter(t));
		}

		return points;
	}

	/**
	 * 转换为线段近似
	 */
	toLineSegments(maxAngleStep: number = Math.PI / 12): Line[] {
		const points = this.discretize(maxAngleStep);
		const segments: Line[] = [];

		for (let i = 0; i < points.length - 1; i++) {
			const p1 = points[i];
			const p2 = points[i + 1];
			if (p1 && p2) {
				segments.push(new Line(p1, p2));
			}
		}

		return segments;
	}

	/**
	 * 转换为折线
	 */
	toPolyline(maxAngleStep: number = Math.PI / 12): Polyline {
		const segments = this.toLineSegments(maxAngleStep);
		return new Polyline(segments);
	}

	/**
	 * 判断是否为圆弧（半径相等）
	 */
	get isCircularArc(): boolean {
		return Math.abs(this.radiusX - this.radiusY) < 1e-10;
	}

	/**
	 * 获取圆弧的圆心角（对于椭圆弧，返回参数空间的圆心角）
	 */
	get centralAngle(): number {
		return Math.abs(this.sweepAngle);
	}

	/**
	 * 获取圆弧的弦长（起点到终点的直线距离）
	 */
	get chordLength(): number {
		return this.startPoint.distanceTo(this.endPoint);
	}

	/**
	 * 获取圆弧的弦中点
	 */
	get chordMidpoint(): Vector2 {
		return Vector2.lerp(this.startPoint, this.endPoint, 0.5);
	}

	/**
	 * 获取圆弧的弓形高度（矢高）
	 */
	get sagitta(): number {
		if (this.isCircularArc) {
			// 圆弧的矢高公式
			const chordLength = this.chordLength;
			const radius = this.radiusX;
			return radius - Math.sqrt(radius * radius - (chordLength * chordLength) / 4);
		} else {
			// 椭圆弧的矢高近似计算
			const chordMid = this.chordMidpoint;
			const arcMid = this.midPoint;
			const chordToArcVector = arcMid.subtract(chordMid);

			// 投影到弦的法线方向
			const chordVector = this.endPoint.subtract(this.startPoint);
			const chordNormal = chordVector.perpendicular().normalized;
			return Math.abs(chordToArcVector.dot(chordNormal));
		}
	}

	/**
	 * 反转圆弧方向
	 */
	reverse(): Arc {
		return new Arc(this.radiusX, this.radiusY, this.center, this.endAngle, -this.sweepAngle);
	}

	/**
	 * 偏移圆弧（沿法线方向）
	 */
	offset(distance: number): Arc {
		// 对于圆弧（半径相等）的简单偏移
		if (this.isCircularArc) {
			const newRadius = this.radiusX + distance;
			if (newRadius <= 0) {
				throw new Error(
					'Offset distance too large, resulting radius would be non-positive'
				);
			}
			return new Arc(
				newRadius,
				newRadius,
				this.center,
				this.startAngle,
				this.sweepAngle
			);
		} else {
			// 对于椭圆弧，偏移更复杂，这里简化处理
			const newRadiusX = this.radiusX + distance;
			const newRadiusY = this.radiusY + distance;

			if (newRadiusX <= 0 || newRadiusY <= 0) {
				throw new Error(
					'Offset distance too large, resulting radii would be non-positive'
				);
			}

			return new Arc(
				newRadiusX,
				newRadiusY,
				this.center,
				this.startAngle,
				this.sweepAngle
			);
		}
	}

	/**
	 * 判断圆弧是否与直线相交
	 */
	intersectsLine(line: Line): boolean {
		// 将直线表示为参数方程，求解与椭圆的交点
		const p0 = line.start;
		const d = line.direction;

		// 椭圆方程：(x - cx)^2 / rx^2 + (y - cy)^2 / ry^2 = 1
		// 直线参数方程：x = p0.x + t*d.x, y = p0.y + t*d.y
		// 代入椭圆方程，求解t

		const cx = this.center.x;
		const cy = this.center.y;
		const rx = this.radiusX;
		const ry = this.radiusY;

		const a = (d.x * d.x) / (rx * rx) + (d.y * d.y) / (ry * ry);
		const b = 2 * (((p0.x - cx) * d.x) / (rx * rx) + ((p0.y - cy) * d.y) / (ry * ry));
		const c = ((p0.x - cx) * (p0.x - cx)) / (rx * rx) + ((p0.y - cy) * (p0.y - cy)) / (ry * ry) - 1;

		const discriminant = b * b - 4 * a * c;

		if (discriminant < 0) {
			return false; // 无交点
		}

		const sqrtDiscriminant = Math.sqrt(discriminant);
		const t1 = (-b - sqrtDiscriminant) / (2 * a);
		const t2 = (-b + sqrtDiscriminant) / (2 * a);

		// 检查交点是否在线段上且在圆弧角度范围内
		const checkIntersection = (t: number): boolean => {
			if (t >= 0 && t <= 1) {
				const point = p0.add(d.multiply(t));
				const dx = point.x - cx;
				const dy = point.y - cy;
				const angle = Math.atan2(dy / ry, dx / rx);
				return this.containsAngle(angle);
			}
			return false;
		};

		return checkIntersection(t1) || checkIntersection(t2);
	}

	/**
	 * 获取圆弧与直线的交点
	 */
	lineIntersectionPoints(line: Line): Vector2[] {
		const p0 = line.start;
		const d = line.direction;

		const cx = this.center.x;
		const cy = this.center.y;
		const rx = this.radiusX;
		const ry = this.radiusY;

		const a = (d.x * d.x) / (rx * rx) + (d.y * d.y) / (ry * ry);
		const b = 2 * (((p0.x - cx) * d.x) / (rx * rx) + ((p0.y - cy) * d.y) / (ry * ry));
		const c = ((p0.x - cx) * (p0.x - cx)) / (rx * rx) + ((p0.y - cy) * (p0.y - cy)) / (ry * ry) - 1;

		const discriminant = b * b - 4 * a * c;

		if (discriminant < 0) {
			return []; // 无交点
		}

		const sqrtDiscriminant = Math.sqrt(discriminant);
		const t1 = (-b - sqrtDiscriminant) / (2 * a);
		const t2 = (-b + sqrtDiscriminant) / (2 * a);

		const points: Vector2[] = [];

		const addIfValid = (t: number) => {
			if (t >= 0 && t <= 1) {
				const point = p0.add(d.multiply(t));
				const dx = point.x - cx;
				const dy = point.y - cy;
				const angle = Math.atan2(dy / ry, dx / rx);
				if (this.containsAngle(angle)) {
					points.push(point);
				}
			}
		};

		addIfValid(t1);
		if (!points[0]?.equals(p0.add(d.multiply(t2)), 1e-10)) {
			addIfValid(t2);
		}

		return points;
	}

	/**
	 * 字符串表示
	 */
	toString(): string {
		const isCircle = this.isFullCircle;
		const circleInfo = isCircle ? ' (Full Circle)' : '';

		return (
			`Arc(center: ${this.center.toString()}, rx: ${this.radiusX}, ry: ${this.radiusY}, ` +
			`start: ${Angle.toDegrees(this.startAngle).toFixed(2)}°, ` +
			`sweep: ${Angle.toDegrees(this.sweepAngle).toFixed(2)}°)${circleInfo}`
		);
	}
}
