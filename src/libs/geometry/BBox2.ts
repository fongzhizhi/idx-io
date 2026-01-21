import { Matrix3 } from './Matrix3';
import { Vector2 } from './Vector2';

/** 边界框 */
export interface IBoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

/**
 * 边界框工具
 * @description 提供边界框的构建、扩展、计算宽高等工具函数
 */
export class BBox2 implements IBoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;

	/**
	 * 空边界框
	 */
	static EMPTY = new BBox2(Infinity, Infinity, -Infinity, -Infinity);

	/**
	 * 创建包含所有点的边界框
	 */
	static fromPoints(points: Vector2[]): BBox2 {
		const firstPoint = points[0];
		if (!firstPoint) return BBox2.EMPTY;

		let minX = firstPoint.x;
		let minY = firstPoint.y;
		let maxX = firstPoint.x;
		let maxY = firstPoint.y;

		for (let i = 1; i < points.length; i++) {
			const point = points[i];
			if (!point) {
				continue;
			}
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}

		return new BBox2(minX, minY, maxX, maxY);
	}

	/**
	 * 创建包含所有边界框的边界框
	 */
	static combine(bboxes: IBoundingBox[]): BBox2 {
		const firstBBox = bboxes[0];
		if (!firstBBox) return BBox2.EMPTY;

		let minX = firstBBox.minX;
		let minY = firstBBox.minY;
		let maxX = firstBBox.maxX;
		let maxY = firstBBox.maxY;

		for (let i = 1; i < bboxes.length; i++) {
			const bbox = bboxes[i];
			if (!bbox) {
				continue;
			}
			minX = Math.min(minX, bbox.minX);
			minY = Math.min(minY, bbox.minY);
			maxX = Math.max(maxX, bbox.maxX);
			maxY = Math.max(maxY, bbox.maxY);
		}

		return new BBox2(minX, minY, maxX, maxY);
	}

	constructor(minX: number, minY: number, maxX: number, maxY: number) {
		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;
	}

	/** 宽度 */
	get width(): number {
		return this.maxX - this.minX;
	}

	/** 高度 */
	get height(): number {
		return this.maxY - this.minY;
	}

	/** 中心点 */
	get center(): Vector2 {
		return new Vector2((this.minX + this.maxX) / 2, (this.minY + this.maxY) / 2);
	}

	/** 是否为空边界框 */
	get isEmpty(): boolean {
		return this.minX > this.maxX || this.minY > this.maxY;
	}

	/**
	 * 扩展边界框以包含点
	 */
	expandToIncludePoint(point: Vector2): this {
		this.minX = Math.min(this.minX, point.x);
		this.minY = Math.min(this.minY, point.y);
		this.maxX = Math.max(this.maxX, point.x);
		this.maxY = Math.max(this.maxY, point.y);
		return this;
	}

	/**
	 * 扩展边界框以包含另一个边界框
	 */
	expandToInclude(bbox: IBoundingBox): this {
		this.minX = Math.min(this.minX, bbox.minX);
		this.minY = Math.min(this.minY, bbox.minY);
		this.maxX = Math.max(this.maxX, bbox.maxX);
		this.maxY = Math.max(this.maxY, bbox.maxY);
		return this;
	}

	/**
	 * 判断是否包含点
	 */
	containsPoint(point: Vector2): boolean {
		return point.x >= this.minX && point.x <= this.maxX && point.y >= this.minY && point.y <= this.maxY;
	}

	/**
	 * 判断是否包含另一个边界框
	 */
	contains(bbox: IBoundingBox): boolean {
		return (
			bbox.minX >= this.minX &&
			bbox.maxX <= this.maxX &&
			bbox.minY >= this.minY &&
			bbox.maxY <= this.maxY
		);
	}

	/**
	 * 判断是否与另一个边界框相交
	 */
	intersects(bbox: IBoundingBox): boolean {
		return !(
			bbox.maxX < this.minX ||
			bbox.minX > this.maxX ||
			bbox.maxY < this.minY ||
			bbox.minY > this.maxY
		);
	}

	/**
	 * 应用变换
	 */
	transform(matrix: Matrix3): BBox2 {
		const corners = [
			new Vector2(this.minX, this.minY),
			new Vector2(this.maxX, this.minY),
			new Vector2(this.maxX, this.maxY),
			new Vector2(this.minX, this.maxY),
		].map(corner => matrix.transformVector(corner));

		return BBox2.fromPoints(corners);
	}

	/**
	 * 克隆边界框
	 */
	clone(): BBox2 {
		return new BBox2(this.minX, this.minY, this.maxX, this.maxY);
	}
}
