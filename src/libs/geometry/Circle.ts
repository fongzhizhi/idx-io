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
		this.radius = Math.abs(radius); // 确保半径为正数
	}

	/**
	 * 应用变换矩阵
	 * @param matrix 变换矩阵
	 * @returns 变换后的圆
	 */
	transform(matrix: Matrix3): Circle {
		const transformedCenter = matrix.transformVector(this.center);
		// 对于圆形，使用矩阵的缩放因子来计算新的半径
		// 取i和j方向缩放的平均值作为半径缩放
		const scaleX = matrix.iScale;
		const scaleY = matrix.jScale;
		const avgScale = (scaleX + scaleY) / 2;
		const transformedRadius = this.radius * avgScale;

		return new Circle(transformedCenter, transformedRadius);
	}

	/**
	 * 计算边界框
	 * @returns 圆的边界框
	 */
	protected calculateBounds(): BBox2 {
		return new BBox2(
			this.center.x - this.radius,
			this.center.y - this.radius,
			this.center.x + this.radius,
			this.center.y + this.radius
		);
	}

	/**
	 * 克隆圆
	 * @returns 新的圆实例
	 */
	clone(): Circle {
		return new Circle(this.center.clone(), this.radius);
	}

	/**
	 * 判断两个圆是否相等
	 * @param other 另一个几何对象
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 是否相等
	 */
	equals(other: Geometry2D, epsilon: number = 1e-10): boolean {
		if (!(other instanceof Circle)) {
			return false;
		}

		return this.center.equals(other.center, epsilon) && Math.abs(this.radius - other.radius) < epsilon;
	}

	/**
	 * 计算圆的周长
	 * @returns 周长
	 */
	get circumference(): number {
		return 2 * Math.PI * this.radius;
	}

	/**
	 * 计算圆的面积
	 * @returns 面积
	 */
	get area(): number {
		return Math.PI * this.radius * this.radius;
	}

	/**
	 * 判断点是否在圆内
	 * @param point 点
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 是否在圆内
	 */
	containsPoint(point: Vector2, epsilon: number = 1e-10): boolean {
		const distanceSquared = this.center.distanceSquaredTo(point);
		const radiusSquared = this.radius * this.radius;
		return distanceSquared <= radiusSquared + epsilon;
	}

	/**
	 * 判断点是否在圆上
	 * @param point 点
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 是否在圆上
	 */
	isPointOnCircle(point: Vector2, epsilon: number = 1e-10): boolean {
		const distance = this.center.distanceTo(point);
		return Math.abs(distance - this.radius) < epsilon;
	}

	/**
	 * 获取圆上指定角度的点
	 * @param angle 角度（弧度）
	 * @returns 圆上的点
	 */
	getPointAtAngle(angle: number): Vector2 {
		return new Vector2(
			this.center.x + this.radius * Math.cos(angle),
			this.center.y + this.radius * Math.sin(angle)
		);
	}

	/**
	 * 计算两个圆的交点
	 * @param other 另一个圆
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 交点数组，可能为空、1个或2个点
	 */
	intersectWithCircle(other: Circle, epsilon: number = 1e-10): Vector2[] {
		const d = this.center.distanceTo(other.center);

		// 圆心重合
		if (d < epsilon) {
			return Math.abs(this.radius - other.radius) < epsilon ? [] : []; // 同心圆
		}

		// 圆不相交
		if (d > this.radius + other.radius + epsilon || d < Math.abs(this.radius - other.radius) - epsilon) {
			return [];
		}

		// 相切
		if (
			Math.abs(d - (this.radius + other.radius)) < epsilon ||
			Math.abs(d - Math.abs(this.radius - other.radius)) < epsilon
		) {
			const ratio = this.radius / d;
			const direction = other.center.subtract(this.center).normalized;
			return [this.center.add(direction.multiply(this.radius))];
		}

		// 两个交点
		const a = (this.radius * this.radius - other.radius * other.radius + d * d) / (2 * d);
		const h = Math.sqrt(this.radius * this.radius - a * a);

		const p2 = this.center.add(other.center.subtract(this.center).multiply(a / d));
		const offset = other.center
			.subtract(this.center)
			.perpendicular()
			.multiply(h / d);

		return [p2.add(offset), p2.subtract(offset)];
	}

	/**
	 * 转换为字符串
	 * @returns 字符串表示
	 */
	toString(): string {
		return `Circle(center: ${this.center.toString()}, radius: ${this.radius})`;
	}
}
