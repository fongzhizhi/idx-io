// ============= src/exporter/utils/geometry-utils.ts =============

// # 几何工具类
// DESIGN: 提供2.5D几何相关的计算、转换和验证功能
// REF: IDXv4.5规范第7.1节，2.5D几何表示法
// PERFORMANCE: 几何计算可能复杂，注意算法效率

import {
  CartesianPoint, CartesianPoint3D, EDMDLengthProperty,
  EDMDCurveSet2D, EDMDPolyLine, EDMDCircleCenter,
  EDMDArc, EDMDBSplineCurve, EDMDEllipse, EDMDCompositeCurve
} from '../../types/core';

/**
 * 几何工具配置
 */
export interface GeometryUtilsConfig {
  /** 默认长度单位 */
  defaultUnit: string;
  
  /** 几何精度（小数位数） */
  precision: number;
  
  /** 是否启用缓存 */
  enableCache?: boolean;
}

/**
 * 边界框信息
 */
export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  width: number;
  height: number;
  depth: number;
}

/**
 * 几何工具类
 * 
 * @remarks
 * 提供2.5D几何相关的通用功能
 * PERFORMANCE: 使用缓存优化重复计算
 * 
 * @example
 * ```typescript
 * // TEST_CASE: 计算点集的边界框
 * const utils = new GeometryUtils(config);
 * const points: CartesianPoint[] = [...];
 * const bbox = utils.calculateBoundingBox(points);
 * // 返回: 包含最小/最大坐标的边界框
 * ```
 */
export class GeometryUtils {
  private config: GeometryUtilsConfig;
  private cache: Map<string, any> = new Map();
  
  constructor(config: GeometryUtilsConfig) {
    this.config = {
      enableCache: true,
      ...config
    };
  }
  
  // ============= 基础几何操作 =============
  /**
   * 四舍五入数值到指定精度
   * 
   * @remarks
   * BUSINESS: IDX文件通常需要特定精度以减小文件大小
   * PERFORMANCE: 简单的数学运算，效率高
   * 
   * @param value - 原始数值
   * @param precision - 精度（小数位数），可选
   * @returns 四舍五入后的数值
   * 
   * @testCase 正数四舍五入
   * @testInput value=1.234567, precision=3
   * @testExpect 返回1.235
   * @testCase 负数四舍五入
   * @testInput value=-1.234567, precision=2
   * @testExpect 返回-1.23
   * @testCase 精度为0
   * @testInput value=1.5, precision=0
   * @testExpect 返回2
   */
  roundValue(value: number, precision?: number): number {
    const p = precision !== undefined ? precision : this.config.precision;
    
    // SECURITY: 确保数值有效
    if (isNaN(value) || !isFinite(value)) {
      throw new Error(`无效的数值: ${value}`);
    }
    
    // 处理边缘情况
    if (p <= 0) {
      return Math.round(value);
    }
    
    const factor = Math.pow(10, p);
    return Math.round(value * factor) / factor;
  }
  
  /**
   * 创建长度属性
   * 
   * @param value - 长度值
   * @param unit - 单位，可选
   * @returns 长度属性对象
   */
  createLengthProperty(value: number, unit?: string): EDMDLengthProperty {
    return {
      Value: this.roundValue(value),
      Unit: unit || this.config.defaultUnit
    };
  }
  
  /**
   * 计算点集的边界框
   * 
   * @remarks
   * PERFORMANCE: O(n)时间复杂度，n为点数
   * 
   * @param points - 点数组
   * @returns 边界框信息
   */
  calculateBoundingBox(points: CartesianPoint[]): BoundingBox {
    if (!points || points.length === 0) {
      return {
        minX: 0, maxX: 0,
        minY: 0, maxY: 0,
        minZ: 0, maxZ: 0,
        width: 0, height: 0, depth: 0
      };
    }
    
    let minX = points[0].X;
    let maxX = points[0].X;
    let minY = points[0].Y;
    let maxY = points[0].Y;
    
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      minX = Math.min(minX, point.X);
      maxX = Math.max(maxX, point.X);
      minY = Math.min(minY, point.Y);
      maxY = Math.max(maxY, point.Y);
    }
    
    return {
      minX: this.roundValue(minX),
      maxX: this.roundValue(maxX),
      minY: this.roundValue(minY),
      maxY: this.roundValue(maxY),
      minZ: 0,
      maxZ: 0,
      width: this.roundValue(maxX - minX),
      height: this.roundValue(maxY - minY),
      depth: 0
    };
  }
  
  // ============= 2.5D几何创建 =============
  /**
   * 创建矩形边界框曲线集
   * 
   * @remarks
   * DESIGN: 用于快速创建元件的2.5D几何表示
   * 
   * @param width - 宽度
   * @param height - 高度
   * @param thickness - 厚度
   * @param zPosition - Z轴位置，默认为0
   * @returns 矩形边界框曲线集
   */
  createBoundingBoxCurveSet(
    width: number,
    height: number,
    thickness: number,
    zPosition: number = 0
  ): EDMDCurveSet2D {
    const cacheKey = `bbox_${width}_${height}_${thickness}_${zPosition}`;
    
    // # 检查缓存
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return { ...this.cache.get(cacheKey) };
    }
    
    // # 验证参数
    if (width <= 0 || height <= 0 || thickness <= 0) {
      throw new Error(`无效的尺寸参数: width=${width}, height=${height}, thickness=${thickness}`);
    }
    
    // # 创建矩形轮廓点
    const points: CartesianPoint[] = [
      { id: this.generateId('PT'), X: 0, Y: 0 },
      { id: this.generateId('PT'), X: this.roundValue(width), Y: 0 },
      { id: this.generateId('PT'), X: this.roundValue(width), Y: this.roundValue(height) },
      { id: this.generateId('PT'), X: 0, Y: this.roundValue(height) }
    ];
    
    // # 创建多边形曲线
    const polyLine: EDMDPolyLine = {
      id: this.generateId('POLYLINE'),
      curveType: 'EDMDPolyLine',
      Points: points,
      Closed: true
    };
    
    // # 计算Z轴范围
    const lowerBound = this.roundValue(zPosition);
    const upperBound = this.roundValue(zPosition + thickness);
    
    // # 创建曲线集
    const curveSet: EDMDCurveSet2D = {
      id: this.generateId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel',
      LowerBound: this.createLengthProperty(lowerBound),
      UpperBound: this.createLengthProperty(upperBound),
      DetailedGeometricModelElement: [polyLine]
    };
    
    // # 缓存结果
    if (this.config.enableCache) {
      this.cache.set(cacheKey, { ...curveSet });
    }
    
    return curveSet;
  }
  
  /**
   * 创建圆形曲线集
   * 
   * @param centerX - 圆心X坐标
   * @param centerY - 圆心Y坐标
   * @param diameter - 直径
   * @param lowerBound - Z轴下界
   * @param upperBound - Z轴上界
   * @returns 圆形曲线集
   */
  createCircleCurveSet(
    centerX: number,
    centerY: number,
    diameter: number,
    lowerBound: number,
    upperBound: number
  ): EDMDCurveSet2D {
    const cacheKey = `circle_${centerX}_${centerY}_${diameter}_${lowerBound}_${upperBound}`;
    
    // # 检查缓存
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return { ...this.cache.get(cacheKey) };
    }
    
    // # 验证参数
    if (diameter <= 0) {
      throw new Error(`无效的直径: ${diameter}`);
    }
    
    if (lowerBound > upperBound) {
      throw new Error(`Z轴范围无效: 下界(${lowerBound})大于上界(${upperBound})`);
    }
    
    // # 创建中心点
    const centerPoint: CartesianPoint = {
      id: this.generateId('POINT'),
      X: this.roundValue(centerX),
      Y: this.roundValue(centerY)
    };
    
    // # 创建圆形曲线
    const circle: EDMDCircleCenter = {
      id: this.generateId('CIRCLE'),
      curveType: 'EDMDCircleCenter',
      CenterPoint: centerPoint,
      Diameter: this.createLengthProperty(diameter)
    };
    
    // # 创建曲线集
    const curveSet: EDMDCurveSet2D = {
      id: this.generateId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel',
      LowerBound: this.createLengthProperty(this.roundValue(lowerBound)),
      UpperBound: this.createLengthProperty(this.roundValue(upperBound)),
      DetailedGeometricModelElement: [circle]
    };
    
    // # 缓存结果
    if (this.config.enableCache) {
      this.cache.set(cacheKey, { ...curveSet });
    }
    
    return curveSet;
  }
  
  /**
   * 创建椭圆曲线集
   * 
   * @param centerX - 中心点X坐标
   * @param centerY - 中心点Y坐标
   * @param semiMajor - 半长轴长度
   * @param semiMinor - 半短轴长度
   * @param rotation - 旋转角度（度）
   * @param lowerBound - Z轴下界
   * @param upperBound - Z轴上界
   * @returns 椭圆曲线集
   */
  createEllipseCurveSet(
    centerX: number,
    centerY: number,
    semiMajor: number,
    semiMinor: number,
    rotation: number,
    lowerBound: number,
    upperBound: number
  ): EDMDCurveSet2D {
    // # 验证参数
    if (semiMajor <= 0 || semiMinor <= 0) {
      throw new Error(`无效的椭圆轴长度: 半长轴=${semiMajor}, 半短轴=${semiMinor}`);
    }
    
    // # 创建椭圆曲线
    const ellipse: EDMDEllipse = {
      id: this.generateId('ELLIPSE'),
      curveType: 'EDMDEllipse',
      CenterPoint: {
        id: this.generateId('POINT'),
        X: this.roundValue(centerX),
        Y: this.roundValue(centerY)
      },
      SemiMajorAxis: this.createLengthProperty(semiMajor),
      SemiMinorAxis: this.createLengthProperty(semiMinor)
      // NOTE: 实际实现中可能需要处理旋转
    };
    
    return {
      id: this.generateId('CURVESET'),
      ShapeDescriptionType: 'GeometricModel',
      LowerBound: this.createLengthProperty(this.roundValue(lowerBound)),
      UpperBound: this.createLengthProperty(this.roundValue(upperBound)),
      DetailedGeometricModelElement: [ellipse]
    };
  }
  
  // ============= 几何验证 =============
  /**
   * 验证多边形是否为凸多边形
   * 
   * @remarks
   * ALGORITHM: 使用叉积法判断多边形凸性
   * PERFORMANCE: O(n)时间复杂度
   * 
   * @param points - 多边形顶点数组
   * @returns 是否为凸多边形
   */
  isConvexPolygon(points: CartesianPoint[]): boolean {
    if (points.length < 3) {
      return false;
    }
    
    let sign = 0;
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[(i + 2) % points.length];
      
      // 计算叉积
      const crossProduct = (p2.X - p1.X) * (p3.Y - p2.Y) - (p2.Y - p1.Y) * (p3.X - p2.X);
      
      if (crossProduct !== 0) {
        if (sign === 0) {
          sign = crossProduct > 0 ? 1 : -1;
        } else if (sign * crossProduct < 0) {
          return false; // 不是凸多边形
        }
      }
    }
    
    return true;
  }
  
  /**
   * 计算多边形面积
   * 
   * @remarks
   * ALGORITHM: 使用鞋带公式（Shoelace formula）
   * 
   * @param points - 多边形顶点数组
   * @returns 多边形面积
   */
  calculatePolygonArea(points: CartesianPoint[]): number {
    if (points.length < 3) {
      return 0;
    }
    
    let area = 0;
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      area += p1.X * p2.Y - p2.X * p1.Y;
    }
    
    return Math.abs(area / 2);
  }
  
  /**
   * 检查点是否在多边形内
   * 
   * @remarks
   * ALGORITHM: 使用射线法（Ray casting algorithm）
   * PERFORMANCE: O(n)时间复杂度
   * 
   * @param point - 待检查的点
   * @param polygon - 多边形顶点数组
   * @returns 点是否在多边形内
   */
  isPointInPolygon(point: CartesianPoint, polygon: CartesianPoint[]): boolean {
    if (polygon.length < 3) {
      return false;
    }
    
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const pi = polygon[i];
      const pj = polygon[j];
      
      const intersect = ((pi.Y > point.Y) !== (pj.Y > point.Y)) &&
        (point.X < (pj.X - pi.X) * (point.Y - pi.Y) / (pj.Y - pi.Y) + pi.X);
      
      if (intersect) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  // ============= 几何变换 =============
  /**
   * 旋转点
   * 
   * @param point - 原始点
   * @param angle - 旋转角度（度）
   * @param center - 旋转中心，默认为原点
   * @returns 旋转后的点
   */
  rotatePoint(
    point: CartesianPoint,
    angle: number,
    center: CartesianPoint = { id: 'ORIGIN', X: 0, Y: 0 }
  ): CartesianPoint {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    // 平移点到原点
    const x = point.X - center.X;
    const y = point.Y - center.Y;
    
    // 旋转
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    
    // 平移回原位置
    return {
      id: point.id,
      X: this.roundValue(rotatedX + center.X),
      Y: this.roundValue(rotatedY + center.Y)
    };
  }
  
  /**
   * 缩放点
   * 
   * @param point - 原始点
   * @param scaleX - X轴缩放因子
   * @param scaleY - Y轴缩放因子
   * @param center - 缩放中心，默认为原点
   * @returns 缩放后的点
   */
  scalePoint(
    point: CartesianPoint,
    scaleX: number,
    scaleY: number,
    center: CartesianPoint = { id: 'ORIGIN', X: 0, Y: 0 }
  ): CartesianPoint {
    // 平移点到原点
    const x = point.X - center.X;
    const y = point.Y - center.Y;
    
    // 缩放
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    
    // 平移回原位置
    return {
      id: point.id,
      X: this.roundValue(scaledX + center.X),
      Y: this.roundValue(scaledY + center.Y)
    };
  }
  
  // ============= 实用方法 =============
  /**
   * 生成唯一ID
   * 
   * @param prefix - ID前缀
   * @returns 唯一ID字符串
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 清理缓存
   * 
   * @remarks
   * PERFORMANCE: 定期清理缓存防止内存泄漏
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存统计
   * 
   * @returns 缓存统计信息
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    // TODO(几何工具): 2024-03-20 实现缓存命中率统计 [P2-NICE_TO_HAVE]
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0
    };
  }
  
  // ============= 单位转换 =============
  /**
   * 毫米转英寸
   * 
   * @param mm - 毫米值
   * @returns 英寸值
   */
  mmToInch(mm: number): number {
    return this.roundValue(mm / 25.4);
  }
  
  /**
   * 英寸转毫米
   * 
   * @param inch - 英寸值
   * @returns 毫米值
   */
  inchToMm(inch: number): number {
    return this.roundValue(inch * 25.4);
  }
  
  /**
   * 毫米转密尔
   * 
   * @param mm - 毫米值
   * @returns 密尔值
   */
  mmToMil(mm: number): number {
    return this.roundValue(mm * 39.3701);
  }
  
  /**
   * 密尔转毫米
   * 
   * @param mil - 密尔值
   * @returns 毫米值
   */
  milToMm(mil: number): number {
    return this.roundValue(mil / 39.3701);
  }
}