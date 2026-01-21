/** 二维向量 */
export class Vector2 {
	/** X坐标 */
	readonly x: number;
	/** Y坐标 */
	readonly y: number;
	/** 唯一标识 */
	private _hash?: number;

	/** 原点(0, 0) */
	static ORIGIN = new Vector2(0, 0);
	/** X轴单位向量(1, 0) */
	static X_AXIS = new Vector2(1, 0);
	/** Y轴单位向量(0, 1) */
	static Y_AXIS = new Vector2(0, 1);

	/** 二维向量 */
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	/** 唯一标识 */
	get hash(): number {
		if (!this._hash) {
			// 使用更合理的哈希算法
			const xHash = (this.x * 2654435761) >>> 0;
			const yHash = (this.y * 2654435761) >>> 0;
			this._hash = ((xHash ^ yHash) * 16777619) >>> 0;
		}
		return this._hash;
	}

	/** 向量长度 */
	get length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/** 向量长度的平方（避免开方运算） */
	get lengthSquared(): number {
		return this.x * this.x + this.y * this.y;
	}

	/** 单位向量 */
	get normalized(): Vector2 {
		const len = this.length;
		if (len === 0) return Vector2.ORIGIN;
		return new Vector2(this.x / len, this.y / len);
	}

	/** 角度（弧度） */
	get angle(): number {
		return Math.atan2(this.y, this.x);
	}

	/**
	 * 向量加法
	 */
	add(v: Vector2 | number): Vector2 {
		if (typeof v === 'number') {
			return new Vector2(this.x + v, this.y + v);
		}
		return new Vector2(this.x + v.x, this.y + v.y);
	}

	/**
	 * 向量减法
	 */
	subtract(v: Vector2 | number): Vector2 {
		if (typeof v === 'number') {
			return new Vector2(this.x - v, this.y - v);
		}
		return new Vector2(this.x - v.x, this.y - v.y);
	}

	/**
	 * 向量乘法
	 */
	multiply(v: Vector2 | number): Vector2 {
		if (typeof v === 'number') {
			return new Vector2(this.x * v, this.y * v);
		}
		return new Vector2(this.x * v.x, this.y * v.y);
	}

	/**
	 * 向量除法
	 */
	divide(v: Vector2 | number): Vector2 {
		if (typeof v === 'number') {
			return new Vector2(this.x / v, this.y / v);
		}
		return new Vector2(this.x / v.x, this.y / v.y);
	}

	/**
	 * 点积
	 */
	dot(v: Vector2): number {
		return this.x * v.x + this.y * v.y;
	}

	/**
	 * 叉积
	 */
	cross(v: Vector2): number {
		return this.x * v.y - this.y * v.x;
	}

	/**
	 * 距离
	 */
	distanceTo(v: Vector2): number {
		const dx = this.x - v.x;
		const dy = this.y - v.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * 距离平方（避免开方运算）
	 */
	distanceSquaredTo(v: Vector2): number {
		const dx = this.x - v.x;
		const dy = this.y - v.y;
		return dx * dx + dy * dy;
	}

	/**
	 * 取反
	 */
	negate(): Vector2 {
		return new Vector2(-this.x, -this.y);
	}

	/**
	 * 垂直向量（逆时针旋转90度）
	 */
	perpendicular(): Vector2 {
		return new Vector2(-this.y, this.x);
	}

	/**
	 * 判断是否相等（考虑浮点误差）
	 */
	equals(v: Vector2, epsilon: number = 1e-10): boolean {
		return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
	}

	/**
	 * 克隆
	 */
	clone(): Vector2 {
		return new Vector2(this.x, this.y);
	}

	/**
	 * 转化为字符串
	 */
	toString(): string {
		return `Vector2(${this.x}, ${this.y})`;
	}

	/**
	 * 从极坐标创建向量
	 */
	static fromPolar(angle: number, radius: number = 1): Vector2 {
		return new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
	}

	/**
	 * 线性插值
	 */
	static lerp(start: Vector2, end: Vector2, t: number): Vector2 {
		return new Vector2(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t);
	}
}
