/**
 * 变换矩阵构建器
 * 
 * 职责：
 * - 构建符合 IDX V4.5 协议的变换矩阵 XML 结构
 * - 处理 2D 和 3D 变换
 * - 支持 Z 轴定位系统
 * 
 * 根据需求 7.1-7.4：
 * - 不使用 xsi:type 属性
 * - 添加 TransformationType 元素
 * - 使用 foundation:Value 包装 tx、ty、tz
 */

/**
 * 2D 变换矩阵接口
 */
export interface EDMDTransformation2D {
  /** 变换类型（固定为 'd2'） */
  TransformationType: 'd2';
  
  /** 旋转和缩放分量 */
  xx: number;
  xy: number;
  yx: number;
  yy: number;
  
  /** 平移分量（使用 foundation:Value 包装） */
  tx: { Value: number };
  ty: { Value: number };
}

/**
 * 3D 变换矩阵接口
 */
export interface EDMDTransformation3D {
  /** 变换类型（固定为 'd3'） */
  TransformationType: 'd3';
  
  /** 旋转和缩放分量 */
  xx: number;
  xy: number;
  xz: number;
  yx: number;
  yy: number;
  yz: number;
  zx: number;
  zy: number;
  zz: number;
  
  /** 平移分量（使用 foundation:Value 包装） */
  tx: { Value: number };
  ty: { Value: number };
  tz: { Value: number };
}

/**
 * 数值格式化配置
 */
export interface NumericFormatConfig {
  /** 坐标精度（小数位数） */
  coordinatePrecision: number;
  
  /** 角度精度（小数位数） */
  anglePrecision: number;
  
  /** 尺寸精度（小数位数） */
  dimensionPrecision: number;
  
  /** 通用数值精度（小数位数） */
  numericPrecision: number;
}

/**
 * 变换矩阵构建器类
 */
export class TransformationBuilder {
  private numericFormat: NumericFormatConfig;
  
  constructor(numericFormat?: Partial<NumericFormatConfig>) {
    this.numericFormat = {
      coordinatePrecision: 6,
      anglePrecision: 6,
      dimensionPrecision: 6,
      numericPrecision: 6,
      ...numericFormat
    };
  }
  
  /**
   * 构建 2D 变换矩阵（修正格式）
   * 
   * 根据需求 7.1：
   * - 不使用 xsi:type 属性
   * - 添加 TransformationType 元素
   * - 使用 foundation:Value 包装 tx、ty
   * 
   * 正确的 XML 结构：
   * ```xml
   * <pdm:Transformation>
   *   <pdm:TransformationType>d2</pdm:TransformationType>
   *   <pdm:xx>value</pdm:xx>
   *   <pdm:xy>value</pdm:xy>
   *   <pdm:yx>value</pdm:yx>
   *   <pdm:yy>value</pdm:yy>
   *   <pdm:tx><foundation:Value>value</foundation:Value></pdm:tx>
   *   <pdm:ty><foundation:Value>value</foundation:Value></pdm:ty>
   * </pdm:Transformation>
   * ```
   * 
   * @param parent 父 XML 元素
   * @param transformation 2D 变换矩阵
   */
  build2DTransformation(parent: any, transformation: EDMDTransformation2D): void {
    // 创建 Transformation 元素（不使用 xsi:type 属性）
    const transElement = parent.ele('pdm:Transformation');
    
    // 添加 TransformationType 元素（根据需求 7.3）
    transElement.ele('pdm:TransformationType').txt('d2');
    
    // 添加旋转和缩放分量
    transElement.ele('pdm:xx').txt(this.formatNumeric(transformation.xx));
    transElement.ele('pdm:xy').txt(this.formatNumeric(transformation.xy));
    transElement.ele('pdm:yx').txt(this.formatNumeric(transformation.yx));
    transElement.ele('pdm:yy').txt(this.formatNumeric(transformation.yy));
    
    // 添加平移分量（使用 foundation:Value 包装，根据需求 7.4）
    const txElement = transElement.ele('pdm:tx');
    txElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.tx.Value));
    
    const tyElement = transElement.ele('pdm:ty');
    tyElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.ty.Value));
  }
  
  /**
   * 构建 3D 变换矩阵
   * 
   * 正确的 XML 结构：
   * ```xml
   * <pdm:Transformation>
   *   <pdm:TransformationType>d3</pdm:TransformationType>
   *   <pdm:xx>value</pdm:xx>
   *   ...
   *   <pdm:tx><foundation:Value>value</foundation:Value></pdm:tx>
   *   <pdm:ty><foundation:Value>value</foundation:Value></pdm:ty>
   *   <pdm:tz><foundation:Value>value</foundation:Value></pdm:tz>
   * </pdm:Transformation>
   * ```
   * 
   * @param parent 父 XML 元素
   * @param transformation 3D 变换矩阵
   */
  build3DTransformation(parent: any, transformation: EDMDTransformation3D): void {
    // 创建 Transformation 元素（不使用 xsi:type 属性）
    const transElement = parent.ele('pdm:Transformation');
    
    // 添加 TransformationType 元素
    transElement.ele('pdm:TransformationType').txt('d3');
    
    // 添加旋转和缩放分量
    transElement.ele('pdm:xx').txt(this.formatNumeric(transformation.xx));
    transElement.ele('pdm:xy').txt(this.formatNumeric(transformation.xy));
    transElement.ele('pdm:xz').txt(this.formatNumeric(transformation.xz));
    transElement.ele('pdm:yx').txt(this.formatNumeric(transformation.yx));
    transElement.ele('pdm:yy').txt(this.formatNumeric(transformation.yy));
    transElement.ele('pdm:yz').txt(this.formatNumeric(transformation.yz));
    transElement.ele('pdm:zx').txt(this.formatNumeric(transformation.zx));
    transElement.ele('pdm:zy').txt(this.formatNumeric(transformation.zy));
    transElement.ele('pdm:zz').txt(this.formatNumeric(transformation.zz));
    
    // 添加平移分量（使用 foundation:Value 包装）
    const txElement = transElement.ele('pdm:tx');
    txElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.tx.Value));
    
    const tyElement = transElement.ele('pdm:ty');
    tyElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.ty.Value));
    
    const tzElement = transElement.ele('pdm:tz');
    tzElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.tz.Value));
  }
  
  /**
   * 从位置和旋转创建 2D 变换矩阵
   * 
   * 这是一个辅助方法，用于从简单的位置和旋转参数创建变换矩阵
   * 
   * @param x X 坐标
   * @param y Y 坐标
   * @param rotation 旋转角度（弧度）
   * @returns 2D 变换矩阵
   */
  createTransformationFromPosition(
    x: number,
    y: number,
    rotation: number = 0
  ): EDMDTransformation2D {
    // 计算旋转矩阵分量
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    return {
      TransformationType: 'd2',
      xx: cos,
      xy: -sin,
      yx: sin,
      yy: cos,
      tx: { Value: x },
      ty: { Value: y }
    };
  }
  
  /**
   * 添加 Z 偏移（IDX v4.5+）
   * 
   * 根据需求 13.5，Z 偏移应该使用 ItemInstance 的 zOffset 属性
   * 
   * @param instanceElement ItemInstance XML 元素
   * @param zOffset Z 偏移值
   */
  addZOffset(instanceElement: any, zOffset: number): void {
    const zOffsetElement = instanceElement.ele('pdm:zOffset');
    zOffsetElement.ele('foundation:Value').txt(this.formatCoordinate(zOffset));
  }
  
  /**
   * 创建单位矩阵（2D）
   * 
   * @returns 单位变换矩阵
   */
  static createIdentity2D(): EDMDTransformation2D {
    return {
      TransformationType: 'd2',
      xx: 1,
      xy: 0,
      yx: 0,
      yy: 1,
      tx: { Value: 0 },
      ty: { Value: 0 }
    };
  }
  
  /**
   * 创建单位矩阵（3D）
   * 
   * @returns 单位变换矩阵
   */
  static createIdentity3D(): EDMDTransformation3D {
    return {
      TransformationType: 'd3',
      xx: 1,
      xy: 0,
      xz: 0,
      yx: 0,
      yy: 1,
      yz: 0,
      zx: 0,
      zy: 0,
      zz: 1,
      tx: { Value: 0 },
      ty: { Value: 0 },
      tz: { Value: 0 }
    };
  }
  
  /**
   * 验证 2D 变换矩阵
   * 
   * @param transformation 变换矩阵
   * @throws Error 如果矩阵无效
   */
  static validate2DTransformation(transformation: EDMDTransformation2D): void {
    if (transformation.TransformationType !== 'd2') {
      throw new Error('Invalid transformation type for 2D transformation');
    }
    
    // 检查所有必需的分量是否存在
    const requiredComponents = ['xx', 'xy', 'yx', 'yy', 'tx', 'ty'];
    for (const component of requiredComponents) {
      if (!(component in transformation)) {
        throw new Error(`Missing required component: ${component}`);
      }
    }
    
    // 检查平移分量是否使用 Value 包装
    if (!transformation.tx.Value && transformation.tx.Value !== 0) {
      throw new Error('tx must have a Value property');
    }
    if (!transformation.ty.Value && transformation.ty.Value !== 0) {
      throw new Error('ty must have a Value property');
    }
    
    // 检查数值是否有效
    const allComponents = [
      transformation.xx,
      transformation.xy,
      transformation.yx,
      transformation.yy,
      transformation.tx.Value,
      transformation.ty.Value
    ];
    
    for (const value of allComponents) {
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error(`Invalid numeric value in transformation: ${value}`);
      }
    }
  }
  
  /**
   * 验证 3D 变换矩阵
   * 
   * @param transformation 变换矩阵
   * @throws Error 如果矩阵无效
   */
  static validate3DTransformation(transformation: EDMDTransformation3D): void {
    if (transformation.TransformationType !== 'd3') {
      throw new Error('Invalid transformation type for 3D transformation');
    }
    
    // 检查所有必需的分量是否存在
    const requiredComponents = ['xx', 'xy', 'xz', 'yx', 'yy', 'yz', 'zx', 'zy', 'zz', 'tx', 'ty', 'tz'];
    for (const component of requiredComponents) {
      if (!(component in transformation)) {
        throw new Error(`Missing required component: ${component}`);
      }
    }
    
    // 检查平移分量是否使用 Value 包装
    if (!transformation.tx.Value && transformation.tx.Value !== 0) {
      throw new Error('tx must have a Value property');
    }
    if (!transformation.ty.Value && transformation.ty.Value !== 0) {
      throw new Error('ty must have a Value property');
    }
    if (!transformation.tz.Value && transformation.tz.Value !== 0) {
      throw new Error('tz must have a Value property');
    }
  }
  
  // 数值格式化方法
  
  /**
   * 格式化坐标值
   */
  private formatCoordinate(value: number): string {
    if (typeof value !== 'number') {
      // Convert string to number if possible
      const numValue = typeof value === 'string' ? parseFloat(value) : 0;
      return isNaN(numValue) ? '0' : numValue.toFixed(this.numericFormat.coordinatePrecision);
    }
    return value.toFixed(this.numericFormat.coordinatePrecision);
  }
  
  /**
   * 格式化通用数值
   */
  private formatNumeric(value: number): string {
    if (typeof value !== 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : 0;
      return isNaN(numValue) ? '0' : numValue.toFixed(this.numericFormat.numericPrecision);
    }
    return value.toFixed(this.numericFormat.numericPrecision);
  }
  
  /**
   * 格式化角度值
   */
  private formatAngle(value: number): string {
    if (typeof value !== 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : 0;
      return isNaN(numValue) ? '0' : numValue.toFixed(this.numericFormat.anglePrecision);
    }
    return value.toFixed(this.numericFormat.anglePrecision);
  }
  
  /**
   * 格式化尺寸值
   */
  private formatDimension(value: number): string {
    if (typeof value !== 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : 0;
      return isNaN(numValue) ? '0' : numValue.toFixed(this.numericFormat.dimensionPrecision);
    }
    return value.toFixed(this.numericFormat.dimensionPrecision);
  }
}
