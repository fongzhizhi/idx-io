import { Angle } from "./Angle";
import { BBox2 } from "./BBox2";
import { Geometry2D, GeometryType } from "./Geometry2D";
import { Matrix3 } from "./Matrix3";
import { Vector2 } from "./Vector2";

/** Arc 圆弧 */
export class Arc extends Geometry2D {
  readonly type = GeometryType.Arc;

  readonly radiusX: number;
  readonly radiusY: number;
  readonly center: Vector2;
  readonly startAngle: number; // 弧度
  readonly sweepAngle: number; // 弧度

  constructor(
    radiusX: number,
    radiusY: number,
    center: Vector2,
    startAngle: number,
    sweepAngle: number
  ) {
    super();
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.center = center;
    this.startAngle = Angle.normalizeRadians(startAngle);
    this.sweepAngle = sweepAngle;
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

  /** 是否闭合（完整圆） */
  get isClosed(): boolean {
    return Math.abs(Math.abs(this.sweepAngle) - Angle.TWO_PI) < 1e-10;
  }

  /** 是否为逆时针方向 */
  get isCounterClockwise(): boolean {
    return this.sweepAngle > 0;
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

    const points = angles.map(angle => 
      new Vector2(
        this.center.x + Math.cos(angle) * this.radiusX,
        this.center.y + Math.sin(angle) * this.radiusY
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
    
    const newStartAngle = Math.atan2(transformedStartVec.y / newRadiusY, transformedStartVec.x / newRadiusX);
    const newEndAngle = Math.atan2(transformedEndVec.y / newRadiusY, transformedEndVec.x / newRadiusX);
    
    return new Arc(
      newRadiusX,
      newRadiusY,
      newCenter,
      newStartAngle,
      newEndAngle - newStartAngle
    );
  }

  clone(): Arc {
    return new Arc(
      this.radiusX,
      this.radiusY,
      this.center.clone(),
      this.startAngle,
      this.sweepAngle
    );
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
        return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd;
      } else {
        return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd;
      }
    } else {
      if (normalizedStart >= normalizedEnd) {
        return normalizedAngle <= normalizedStart && normalizedAngle >= normalizedEnd;
      } else {
        return normalizedAngle <= normalizedStart || normalizedAngle >= normalizedEnd;
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
      new Arc(this.radiusX, this.radiusY, this.center, angle, secondSweep)
    ];
  }
}