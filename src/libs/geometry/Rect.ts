import { BBox2 } from './BBox2';
import { Geometry2D, GeometryType } from './Geometry2D';
import { Matrix3 } from './Matrix3';
import { Polyline } from './Polyline';
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

	/** 矩形 */
	constructor(leftBottom: Vector2, width: number, height: number) {
		super();
		this.leftBottom = leftBottom;
		this.width = Math.abs(width); // 确保宽度为正数
		this.height = Math.abs(height); // 确保高度为正数
	}

	/**
	 * 从中心点和尺寸创建矩形
	 * @param center 中心点
	 * @param width 宽度
	 * @param height 高度
	 * @returns 矩形实例
	 */
	static fromCenter(center: Vector2, width: number, height: number): Rect {
		const halfWidth = Math.abs(width) / 2;
		const halfHeight = Math.abs(height) / 2;
		const leftBottom = new Vector2(center.x - halfWidth, center.y - halfHeight);
		return new Rect(leftBottom, width, height);
	}

	/**
	 * 从两个对角点创建矩形
	 * @param point1 第一个点
	 * @param point2 对角点
	 * @returns 矩形实例
	 */
	static fromTwoPoints(point1: Vector2, point2: Vector2): Rect {
		const minX = Math.min(point1.x, point2.x);
		const minY = Math.min(point1.y, point2.y);
		const maxX = Math.max(point1.x, point2.x);
		const maxY = Math.max(point1.y, point2.y);

		return new Rect(new Vector2(minX, minY), maxX - minX, maxY - minY);
	}

	/**
	 * 应用变换矩阵
	 * @param matrix 变换矩阵
	 * @returns 变换后的矩形（可能不再是轴对齐的矩形）
	 */
	transform(matrix: Matrix3): Rect {
		// 获取矩形的四个角点
		const corners = this.getCorners();

		// 变换所有角点
		const transformedCorners = corners.map(corner => matrix.transformVector(corner));

		// 计算变换后的边界框
		const bbox = BBox2.fromPoints(transformedCorners);

		// 返回新的轴对齐矩形
		return new Rect(new Vector2(bbox.minX, bbox.minY), bbox.width, bbox.height);
	}

	/**
	 * 计算边界框
	 * @returns 矩形的边界框
	 */
	protected calculateBounds(): BBox2 {
		return new BBox2(
			this.leftBottom.x,
			this.leftBottom.y,
			this.leftBottom.x + this.width,
			this.leftBottom.y + this.height
		);
	}

	/**
	 * 克隆矩形
	 * @returns 新的矩形实例
	 */
	clone(): Rect {
		return new Rect(this.leftBottom.clone(), this.width, this.height);
	}

	/**
	 * 判断两个矩形是否相等
	 * @param other 另一个几何对象
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 是否相等
	 */
	equals(other: Geometry2D, epsilon: number = 1e-10): boolean {
		if (!(other instanceof Rect)) {
			return false;
		}

		return (
			this.leftBottom.equals(other.leftBottom, epsilon) &&
			Math.abs(this.width - other.width) < epsilon &&
			Math.abs(this.height - other.height) < epsilon
		);
	}

	/**
	 * 获取中心点
	 * @returns 中心点
	 */
	get center(): Vector2 {
		return new Vector2(this.leftBottom.x + this.width / 2, this.leftBottom.y + this.height / 2);
	}

	/**
	 * 获取右上角点
	 * @returns 右上角点
	 */
	get rightTop(): Vector2 {
		return new Vector2(this.leftBottom.x + this.width, this.leftBottom.y + this.height);
	}

	/**
	 * 获取左上角点
	 * @returns 左上角点
	 */
	get leftTop(): Vector2 {
		return new Vector2(this.leftBottom.x, this.leftBottom.y + this.height);
	}

	/**
	 * 获取右下角点
	 * @returns 右下角点
	 */
	get rightBottom(): Vector2 {
		return new Vector2(this.leftBottom.x + this.width, this.leftBottom.y);
	}

	/**
	 * 获取所有角点
	 * @returns 角点数组 [左下, 右下, 右上, 左上]
	 */
	getCorners(): Vector2[] {
		return [this.leftBottom, this.rightBottom, this.rightTop, this.leftTop];
	}

	/**
	 * 计算矩形的面积
	 * @returns 面积
	 */
	get area(): number {
		return this.width * this.height;
	}

	/**
	 * 计算矩形的周长
	 * @returns 周长
	 */
	get perimeter(): number {
		return 2 * (this.width + this.height);
	}

	/**
	 * 判断点是否在矩形内
	 * @param point 点
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 是否在矩形内
	 */
	containsPoint(point: Vector2, epsilon: number = 1e-10): boolean {
		return (
			point.x >= this.leftBottom.x - epsilon &&
			point.x <= this.leftBottom.x + this.width + epsilon &&
			point.y >= this.leftBottom.y - epsilon &&
			point.y <= this.leftBottom.y + this.height + epsilon
		);
	}

	/**
	 * 判断是否包含另一个矩形
	 * @param other 另一个矩形
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 是否包含
	 */
	containsRect(other: Rect, epsilon: number = 1e-10): boolean {
		return (
			other.leftBottom.x >= this.leftBottom.x - epsilon &&
			other.leftBottom.y >= this.leftBottom.y - epsilon &&
			other.rightTop.x <= this.rightTop.x + epsilon &&
			other.rightTop.y <= this.rightTop.y + epsilon
		);
	}

	/**
	 * 判断是否与另一个矩形相交
	 * @param other 另一个矩形
	 * @param epsilon 误差范围，默认1e-10
	 * @returns 是否相交
	 */
	intersectsRect(other: Rect, epsilon: number = 1e-10): boolean {
		return !(
			other.rightTop.x < this.leftBottom.x - epsilon ||
			other.leftBottom.x > this.rightTop.x + epsilon ||
			other.rightTop.y < this.leftBottom.y - epsilon ||
			other.leftBottom.y > this.rightTop.y + epsilon
		);
	}

	/**
	 * 计算与另一个矩形的交集
	 * @param other 另一个矩形
	 * @returns 交集矩形，如果不相交则返回null
	 */
	intersectionWith(other: Rect): Rect | null {
		if (!this.intersectsRect(other)) {
			return null;
		}

		const minX = Math.max(this.leftBottom.x, other.leftBottom.x);
		const minY = Math.max(this.leftBottom.y, other.leftBottom.y);
		const maxX = Math.min(this.rightTop.x, other.rightTop.x);
		const maxY = Math.min(this.rightTop.y, other.rightTop.y);

		return new Rect(new Vector2(minX, minY), maxX - minX, maxY - minY);
	}

	/**
	 * 计算与另一个矩形的并集
	 * @param other 另一个矩形
	 * @returns 并集矩形
	 */
	unionWith(other: Rect): Rect {
		const minX = Math.min(this.leftBottom.x, other.leftBottom.x);
		const minY = Math.min(this.leftBottom.y, other.leftBottom.y);
		const maxX = Math.max(this.rightTop.x, other.rightTop.x);
		const maxY = Math.max(this.rightTop.y, other.rightTop.y);

		return new Rect(new Vector2(minX, minY), maxX - minX, maxY - minY);
	}

	/**
	 * 扩展矩形
	 * @param padding 扩展的边距
	 * @returns 扩展后的矩形
	 */
	expand(padding: number): Rect {
		return new Rect(
			new Vector2(this.leftBottom.x - padding, this.leftBottom.y - padding),
			this.width + 2 * padding,
			this.height + 2 * padding
		);
	}

	/**
	 * 缩放矩形
	 * @param scaleX X方向缩放比例
	 * @param scaleY Y方向缩放比例，默认与scaleX相同
	 * @returns 缩放后的矩形
	 */
	scale(scaleX: number, scaleY: number = scaleX): Rect {
		const center = this.center;
		const newWidth = this.width * Math.abs(scaleX);
		const newHeight = this.height * Math.abs(scaleY);

		return Rect.fromCenter(center, newWidth, newHeight);
	}

	/** 转为折线 */
	toPolyline() {
		const leftTop = this.leftTop;
		const leftBottom = this.leftBottom;
		const rightBottom = this.rightBottom;
		const rightTop = this.rightTop;
		return Polyline.fromPoints([leftTop, leftBottom, rightBottom, rightTop, leftTop]);
	}

	/**
	 * 转换为字符串
	 * @returns 字符串表示
	 */
	toString(): string {
		return `Rect(leftBottom: ${this.leftBottom.toString()}, width: ${this.width}, height: ${this.height})`;
	}
}
