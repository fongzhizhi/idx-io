import { Angle } from './Angle';
import { Vector2 } from './Vector2';

/** 3*3矩阵-数据 */
export type Matrix3Data = [number, number, number, number, number, number, number, number, number];

/** 3维矩阵 */
export class Matrix3 {
	static IDENTITY = new Matrix3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
	static MIRROR_X = new Matrix3([-1, 0, 0, 0, 1, 0, 0, 0, 1]);
	static MIRROR_Y = new Matrix3([1, 0, 0, 0, -1, 0, 0, 0, 1]);
	static ROT_90 = new Matrix3([0, 1, 0, -1, 0, 0, 0, 0, 1]);
	static ROT_N90 = new Matrix3([0, -1, 0, 1, 0, 0, 0, 0, 1]);

	readonly data: Matrix3Data;
	readonly m = 3;
	readonly n = 3;
	readonly iScale: number;
	readonly jScale: number;

	/** 3维矩阵 */
	constructor(data: Matrix3Data) {
		this.data = data;
		const a = data[0];
		const b = data[1];
		const d = data[3];
		const e = data[4];
		this.iScale = Math.sqrt(a * a + b * b);
		this.jScale = Math.sqrt(d * d + e * e);
	}

	/** 创建平移矩阵 */
	static translate(x: number, y: number): Matrix3 {
		return new Matrix3([1, 0, 0, 0, 1, 0, x, y, 1]);
	}

	static translateByVector(vec: Vector2): Matrix3 {
		return this.translate(vec.x, vec.y);
	}

	/** 创建旋转矩阵 */
	static rotate(radian: number): Matrix3 {
		const cos = Math.cos(radian);
		const sin = Math.sin(radian);
		return new Matrix3([cos, sin, 0, -sin, cos, 0, 0, 0, 1]);
	}

	static rotateByDegrees(degree: number): Matrix3 {
		return this.rotate(Angle.toRadians(degree));
	}

	/** 创建缩放矩阵 */
	static scale(ratio: number): Matrix3 {
		return new Matrix3([ratio, 0, 0, 0, ratio, 0, 0, 0, 1]);
	}

	static scaleNonUniform(xRatio: number, yRatio: number): Matrix3 {
		return new Matrix3([xRatio, 0, 0, 0, yRatio, 0, 0, 0, 1]);
	}

	/** 矩阵乘法 */
	multiply(other: Matrix3): Matrix3 {
		const a = this.data;
		const b = other.data;
		return new Matrix3([
			a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
			a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
			a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
			a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
			a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
			a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
			a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
			a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
			a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
		]);
	}

	/** 变换向量 */
	transformVector(v: Vector2): Vector2 {
		const x = v.x;
		const y = v.y;
		return new Vector2(
			this.data[0] * x + this.data[3] * y + this.data[6],
			this.data[1] * x + this.data[4] * y + this.data[7]
		);
	}

	/** 逆矩阵 */
	inverse(): Matrix3 | null {
		const a = this.data;
		const determinant =
			a[0] * (a[4] * a[8] - a[5] * a[7]) -
			a[1] * (a[3] * a[8] - a[5] * a[6]) +
			a[2] * (a[3] * a[7] - a[4] * a[6]);

		if (Math.abs(determinant) < 1e-10) return null;

		const invDet = 1 / determinant;
		return new Matrix3([
			(a[4] * a[8] - a[5] * a[7]) * invDet,
			(a[2] * a[7] - a[1] * a[8]) * invDet,
			(a[1] * a[5] - a[2] * a[4]) * invDet,
			(a[5] * a[6] - a[3] * a[8]) * invDet,
			(a[0] * a[8] - a[2] * a[6]) * invDet,
			(a[2] * a[3] - a[0] * a[5]) * invDet,
			(a[3] * a[7] - a[4] * a[6]) * invDet,
			(a[1] * a[6] - a[0] * a[7]) * invDet,
			(a[0] * a[4] - a[1] * a[3]) * invDet,
		]);
	}

	/** 转置矩阵 */
	transpose(): Matrix3 {
		const a = this.data;
		return new Matrix3([a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]]);
	}

	/** 判断是否相等 */
	equals(other: Matrix3, epsilon: number = 1e-10): boolean {
		for (let i = 0; i < 9; i++) {
			const m = this.data[i] || 0;
			const n = other.data[i] || 0;
			if (Math.abs(m - n) > epsilon) return false;
		}
		return true;
	}

	/** 克隆 */
	clone(): Matrix3 {
		return new Matrix3([...this.data] as Matrix3Data);
	}

	/** 转换为字符串 */
	toString(): string {
		return `Matrix3([
      ${this.data.slice(0, 3).join(', ')}
      ${this.data.slice(3, 6).join(', ')}
      ${this.data.slice(6, 9).join(', ')}
    ])`;
	}
}
