import { Vector2 } from "./Vector2";

/** 
 * 角度工具
 * @description 提供角度与弧度的转换等相关角度工具函数
 */
export class Angle {
  /** π 常量 */
  static readonly PI = Math.PI;
  /** 2π 常量 */
  static readonly TWO_PI = Math.PI * 2;
  /** π/2 常量 */
  static readonly HALF_PI = Math.PI / 2;
  /** 角度转弧度的系数 */
  static readonly DEG_TO_RAD = Math.PI / 180;
  /** 弧度转角度的系数 */
  static readonly RAD_TO_DEG = 180 / Math.PI;

  /**
   * 角度转弧度
   * @param degrees 角度值
   * @returns 弧度值
   */
  static toRadians(degrees: number): number {
    return degrees * this.DEG_TO_RAD;
  }

  /**
   * 弧度转角度
   * @param radians 弧度值
   * @returns 角度值
   */
  static toDegrees(radians: number): number {
    return radians * this.RAD_TO_DEG;
  }

  /**
   * 规范化角度到 [0, 2π)
   * @param radians 弧度值
   * @returns 规范化的弧度值
   */
  static normalizeRadians(radians: number): number {
    let angle = radians % this.TWO_PI;
    if (angle < 0) angle += this.TWO_PI;
    return angle;
  }

  /**
   * 规范化角度到 [0, 360)
   * @param degrees 角度值
   * @returns 规范化的角度值
   */
  static normalizeDegrees(degrees: number): number {
    let angle = degrees % 360;
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * 计算两点之间的角度（弧度）
   * @param start 起点
   * @param end 终点
   * @returns 角度（弧度）
   */
  static betweenPoints(start: Vector2, end: Vector2): number {
    return Math.atan2(end.y - start.y, end.x - start.x);
  }
}