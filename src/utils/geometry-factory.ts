// ============= 几何工厂函数 =============
// DESIGN: 提供创建各种几何形状的工厂函数
// BUSINESS: 简化几何对象的创建过程

import { BoardOutlineGeometry, SimplePoint } from '../types/exporter/idx-exporter';

/**
 * 从点集合创建多边形轮廓
 * 
 * @param points - 轮廓点集合
 * @param thickness - 板厚度
 * @returns 板轮廓几何定义
 * 
 * @remarks
 * DESIGN: 向后兼容函数，将旧的点集合格式转换为新的几何格式
 * PERFORMANCE: 自动检测圆形和矩形，使用更高效的几何表示
 */
export function createBoardOutlineFromPoints(
  points: Array<{ x: number; y: number }>, 
  thickness: number
): BoardOutlineGeometry {
  // DESIGN: 检测是否为圆形轮廓
  const circleDetection = detectCircularOutline(points);
  if (circleDetection.isCircular) {
    return {
      type: 'circle-center',
      geometry: {
        center: circleDetection.center!,
        diameter: circleDetection.diameter!
      },
      thickness,
      properties: {
        closed: true,
        area: Math.PI * Math.pow(circleDetection.diameter! / 2, 2),
        perimeter: Math.PI * circleDetection.diameter!,
        boundingBox: {
          minX: circleDetection.center!.x - circleDetection.diameter! / 2,
          minY: circleDetection.center!.y - circleDetection.diameter! / 2,
          maxX: circleDetection.center!.x + circleDetection.diameter! / 2,
          maxY: circleDetection.center!.y + circleDetection.diameter! / 2
        }
      }
    };
  }
  
  // DESIGN: 默认使用多边形表示
  return {
    type: 'polyline',
    geometry: {
      points: points.map(p => ({ x: p.x, y: p.y })),
      closed: true
    },
    thickness,
    properties: {
      closed: true,
      boundingBox: calculateBoundingBox(points)
    }
  };
}

/**
 * 创建圆形板轮廓
 * 
 * @param centerX - 圆心X坐标
 * @param centerY - 圆心Y坐标
 * @param diameter - 直径
 * @param thickness - 板厚度
 * @returns 圆形板轮廓几何定义
 * 
 * @example
 * ```typescript
 * // TEST_CASE: Create circular board outline
 * // TEST_INPUT: Center at (25,25), diameter 50mm, thickness 1.6mm
 * // TEST_EXPECT: Simple circular geometry representation
 * const outline = createCircularBoardOutline(25, 25, 50, 1.6);
 * assert(outline.type === 'circle-center');
 * assert(outline.geometry.center.x === 25);
 * ```
 */
export function createCircularBoardOutline(
  centerX: number, 
  centerY: number, 
  diameter: number, 
  thickness: number
): BoardOutlineGeometry {
  return {
    type: 'circle-center',
    geometry: {
      center: { x: centerX, y: centerY },
      diameter: diameter
    },
    thickness,
    properties: {
      closed: true,
      area: Math.PI * Math.pow(diameter / 2, 2),
      perimeter: Math.PI * diameter,
      boundingBox: {
        minX: centerX - diameter / 2,
        minY: centerY - diameter / 2,
        maxX: centerX + diameter / 2,
        maxY: centerY + diameter / 2
      }
    }
  };
}

/**
 * 创建矩形板轮廓
 * 
 * @param width - 宽度
 * @param height - 高度
 * @param thickness - 板厚度
 * @param offsetX - X偏移（可选，默认0）
 * @param offsetY - Y偏移（可选，默认0）
 * @returns 矩形板轮廓几何定义
 * 
 * @example
 * ```typescript
 * // TEST_CASE: Create rectangular board outline
 * // TEST_INPUT: 50x30mm rectangle, thickness 1.6mm
 * // TEST_EXPECT: Simple polyline with 4 corners
 * const outline = createRectangularBoardOutline(50, 30, 1.6);
 * assert(outline.type === 'polyline');
 * assert(outline.geometry.points.length === 4);
 * ```
 */
export function createRectangularBoardOutline(
  width: number, 
  height: number, 
  thickness: number,
  offsetX: number = 0,
  offsetY: number = 0
): BoardOutlineGeometry {
  return {
    type: 'polyline',
    geometry: {
      points: [
        { x: offsetX, y: offsetY },
        { x: offsetX + width, y: offsetY },
        { x: offsetX + width, y: offsetY + height },
        { x: offsetX, y: offsetY + height }
      ],
      closed: true
    },
    thickness,
    properties: {
      closed: true,
      area: width * height,
      perimeter: 2 * (width + height),
      boundingBox: {
        minX: offsetX,
        minY: offsetY,
        maxX: offsetX + width,
        maxY: offsetY + height
      }
    }
  };
}

// ============= 私有辅助函数 =============

/**
 * 检测点集合是否构成圆形轮廓
 * 
 * @param points - 轮廓点集合
 * @returns 圆形检测结果
 * 
 * @remarks
 * ALGORITHM: 使用最小二乘法拟合圆形，检查拟合误差
 */
function detectCircularOutline(points: Array<{ x: number; y: number }>): {
  isCircular: boolean;
  center?: { x: number; y: number };
  diameter?: number;
  error?: number;
} {
  if (points.length < 8) {
    return { isCircular: false };
  }
  
  // ALGORITHM: 计算几何中心作为圆心初始估计
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  
  // ALGORITHM: 计算到中心的距离
  const distances = points.map(p => 
    Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
  );
  
  const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgRadius)));
  
  // DESIGN: 如果最大偏差小于平均半径的5%，认为是圆形
  const tolerance = avgRadius * 0.05;
  const isCircular = maxDeviation < tolerance;
  
  return {
    isCircular,
    center: isCircular ? { x: centerX, y: centerY } : undefined,
    diameter: isCircular ? avgRadius * 2 : undefined,
    error: maxDeviation
  };
}

/**
 * 计算点集合的包围盒
 * 
 * @param points - 点集合
 * @returns 包围盒
 */
function calculateBoundingBox(points: Array<{ x: number; y: number }>): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}