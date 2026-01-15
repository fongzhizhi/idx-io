// ============= src/exporter/validation/validators/board-data-validator.ts =============

// # 板数据验证器
// DESIGN: 验证PCB板的基本信息和轮廓数据
// REF: Requirements 5.1, 5.2
// BUSINESS: 确保板数据完整性，包括ID、名称、轮廓等必需信息

import { DataValidator } from './data-validator';
import { ValidationResult, BoardData } from '../validation-engine';

/**
 * 板数据验证器
 * 
 * @remarks
 * 验证PCB板的基本信息，包括ID、名称、轮廓等
 * BUSINESS: 板数据是IDX文件的核心，必须确保完整性和正确性
 * 
 * @example
 * ```typescript
 * const validator = new BoardDataValidator();
 * const result = validator.validate(boardData);
 * if (!result.valid) {
 *   console.log('Board validation errors:', result.errors);
 * }
 * ```
 */
export class BoardDataValidator extends DataValidator {
  
  /**
   * 验证板数据
   * 
   * @param data - 板数据
   * @returns 验证结果
   */
  validate(data: BoardData): ValidationResult<BoardData> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // # 验证基本字段
    this.validateBasicFields(data, errors, warnings);
    
    // # 验证轮廓数据
    this.validateOutline(data, errors, warnings);
    
    // # 验证可选字段
    this.validateOptionalFields(data, errors, warnings);
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
      warnings
    };
  }
  
  /**
   * 验证基本字段
   * 
   * @param data - 板数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validateBasicFields(data: BoardData, errors: string[], warnings: string[]): void {
    // 验证ID
    const idError = this.validateId(data.id, 'Board ID');
    if (idError) {
      errors.push(idError);
    }
    
    // 验证名称
    const nameError = this.validateRequiredField(data, 'name', 'Board name');
    if (nameError) {
      errors.push(nameError);
    } else {
      const nameFormatError = this.validateStringField(data.name, 'Board name', 1, 200);
      if (nameFormatError) {
        errors.push(nameFormatError);
      }
    }
    
    // 检查ID和名称是否相同（通常应该不同）
    if (data.id && data.name && data.id === data.name) {
      warnings.push('板ID和名称相同。建议使用更具描述性的名称以区别于ID。');
    }
  }
  
  /**
   * 验证轮廓数据
   * 
   * @param data - 板数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validateOutline(data: BoardData, errors: string[], warnings: string[]): void {
    if (!data.outline) {
      errors.push('板轮廓是必需的但缺失。请定义包含点和厚度的板轮廓。');
      return;
    }
    
    // 验证轮廓对象结构
    const outlineError = this.validateObjectField(data.outline, 'Board outline', ['points', 'thickness']);
    if (outlineError) {
      errors.push(outlineError);
      return;
    }
    
    // 验证厚度
    const thicknessError = this.validateNumericField(
      data.outline.thickness, 
      'Board outline thickness', 
      0.1, // 最小0.1mm
      10   // 最大10mm
    );
    if (thicknessError) {
      errors.push(thicknessError);
    } else {
      // 检查常见厚度值
      const commonThicknesses = [0.8, 1.0, 1.2, 1.6, 2.0, 2.4, 3.2];
      if (!commonThicknesses.includes(data.outline.thickness)) {
        warnings.push(`板厚度 ${data.outline.thickness}mm 不是标准值。常见厚度有: ${commonThicknesses.join(', ')}mm。`);
      }
    }
    
    // 验证轮廓点
    this.validateOutlinePoints(data.outline.points, errors, warnings);
  }
  
  /**
   * 验证轮廓点
   * 
   * @param points - 轮廓点数组
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validateOutlinePoints(points: any, errors: string[], warnings: string[]): void {
    const pointsError = this.validateArrayField(points, 'Board outline points', 3);
    if (pointsError) {
      errors.push(pointsError);
      return;
    }
    
    // 验证每个点
    for (let i = 0; i < points.length; i++) {
      const pointError = this.validatePoint(points[i], `Board outline point[${i}]`);
      if (pointError) {
        errors.push(pointError);
      }
    }
    
    // 检查轮廓是否闭合
    if (points.length >= 3) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      
      if (Math.abs(firstPoint.x - lastPoint.x) > 0.001 || 
          Math.abs(firstPoint.y - lastPoint.y) > 0.001) {
        warnings.push('板轮廓可能未闭合。第一个和最后一个点应该相同或非常接近以形成闭合多边形。');
      }
    }
    
    // 检查轮廓面积
    const area = this.calculatePolygonArea(points);
    if (area < 1) {
      warnings.push(`板轮廓面积很小 (${area.toFixed(2)} mm²)。请验证轮廓尺寸。`);
    } else if (area > 100000) {
      warnings.push(`板轮廓面积很大 (${area.toFixed(2)} mm²)。请验证轮廓尺寸。`);
    }
    
    // 检查自相交
    if (this.hasSelfintersection(points)) {
      errors.push('板轮廓有自相交。请确保轮廓形成简单多边形，不自相交。');
    }
  }
  
  /**
   * 验证可选字段
   * 
   * @param data - 板数据
   * @param errors - 错误列表
   * @param warnings - 警告列表
   */
  private validateOptionalFields(data: BoardData, errors: string[], warnings: string[]): void {
    // 验证属性对象
    if (data.properties && typeof data.properties !== 'object') {
      errors.push('板属性必须是对象（如果提供）。');
    }
    
    // 检查是否有层数据但没有层叠结构
    if (data.layers && data.layers.length > 1 && !data.layerStackup) {
      warnings.push('板有多层但未定义层叠结构。建议添加层叠信息以获得更好的设计文档。');
    }
    
    // 检查是否有组件但没有组件数据
    if (data.components && data.components.length === 0) {
      warnings.push('板组件数组为空。如果没有组件，建议移除 components 属性。');
    }
    
    // 检查是否有孔但没有孔数据
    if (data.holes && data.holes.length === 0) {
      warnings.push('板孔数组为空。如果没有孔，建议移除 holes 属性。');
    }
    
    // 检查是否有禁止区但没有禁止区数据
    if (data.keepouts && data.keepouts.length === 0) {
      warnings.push('板禁止区数组为空。如果没有禁止区，建议移除 keepouts 属性。');
    }
  }
  
  /**
   * 计算多边形面积
   * 
   * @param points - 多边形顶点
   * @returns 面积（平方毫米）
   */
  private calculatePolygonArea(points: Array<{ x: number; y: number }>): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }
  
  /**
   * 检查多边形是否有自相交
   * 
   * @param points - 多边形顶点
   * @returns 是否有自相交
   */
  private hasSelfintersection(points: Array<{ x: number; y: number }>): boolean {
    if (points.length < 4) return false;
    
    // 简化的自相交检测：检查相邻边是否相交
    for (let i = 0; i < points.length; i++) {
      const line1Start = points[i];
      const line1End = points[(i + 1) % points.length];
      
      for (let j = i + 2; j < points.length; j++) {
        // 跳过相邻的边
        if (j === points.length - 1 && i === 0) continue;
        
        const line2Start = points[j];
        const line2End = points[(j + 1) % points.length];
        
        if (this.linesIntersect(line1Start, line1End, line2Start, line2End)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 检查两条线段是否相交
   * 
   * @param p1 - 线段1起点
   * @param p2 - 线段1终点
   * @param p3 - 线段2起点
   * @param p4 - 线段2终点
   * @returns 是否相交
   */
  private linesIntersect(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ): boolean {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    
    if (Math.abs(denom) < 1e-10) {
      return false; // 平行线
    }
    
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}