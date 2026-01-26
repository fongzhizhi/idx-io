/**
 * 几何工具函数
 * 
 * @description 为案例提供常用的几何形状创建功能
 * @author IDX导入导出项目
 */

import { Rect } from '../../src/libs/geometry/Rect';
import { Circle } from '../../src/libs/geometry/Circle';
import { Vector2 } from '../../src/libs/geometry/Vector2';
import { Polyline } from '../../src/libs/geometry/Polyline';
import { Line } from '../../src/libs/geometry/Line';

/**
 * 创建标准PCB板轮廓
 * 
 * @param width 宽度（mm）
 * @param height 高度（mm）
 * @param origin 原点位置，默认为(0,0)
 * @returns 矩形轮廓
 */
export function createBoardOutline(width: number, height: number, origin: Vector2 = new Vector2(0, 0)): Rect {
    return new Rect(origin, width, height);
}

/**
 * 创建标准的矩形封装轮廓
 * 
 * @param width 宽度（mm）
 * @param height 高度（mm）
 * @param center 中心点位置
 * @returns 矩形轮廓
 */
export function createRectangularFootprint(width: number, height: number, center: Vector2 = Vector2.ORIGIN): Rect {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const leftBottom = new Vector2(center.x - halfWidth, center.y - halfHeight);
    return new Rect(leftBottom, width, height);
}

/**
 * 创建圆形封装轮廓
 * 
 * @param diameter 直径（mm）
 * @param center 中心点位置
 * @returns 圆形轮廓
 */
export function createCircularFootprint(diameter: number, center: Vector2 = Vector2.ORIGIN): Circle {
    return new Circle(center, diameter / 2);
}

/**
 * 创建标准的过孔几何
 * 
 * @param diameter 直径（mm）
 * @param center 中心点位置
 * @returns 圆形几何
 */
export function createViaGeometry(diameter: number, center: Vector2): Circle {
    return new Circle(center, diameter / 2);
}

/**
 * 创建矩形禁止区
 * 
 * @param width 宽度（mm）
 * @param height 高度（mm）
 * @param center 中心点位置
 * @returns 矩形轮廓
 */
export function createRectangularKeepout(width: number, height: number, center: Vector2): Rect {
    return createRectangularFootprint(width, height, center);
}

/**
 * 创建多边形保留区
 * 
 * @param points 多边形顶点数组
 * @returns 多边形轮廓
 */
export function createPolygonalKeepin(points: Vector2[]): Polyline {
    if (points.length < 3) {
        throw new Error('多边形至少需要3个点');
    }
    
    // 确保多边形闭合
    const closedPoints = [...points];
    if (!points[0].equals(points[points.length - 1])) {
        closedPoints.push(points[0]);
    }
    
    return Polyline.fromPoints(closedPoints);
}

/**
 * 创建标准的R0603封装轮廓
 * 
 * @param center 中心点位置
 * @returns R0603封装轮廓
 */
export function createR0603Footprint(center: Vector2 = Vector2.ORIGIN): Rect {
    // R0603: 1.6mm x 0.8mm
    return createRectangularFootprint(1.6, 0.8, center);
}

/**
 * 创建标准的M3螺丝孔轮廓
 * 
 * @param center 中心点位置
 * @returns M3螺丝孔轮廓
 */
export function createM3Footprint(center: Vector2 = Vector2.ORIGIN): Circle {
    // M3螺丝孔直径：3.2mm（考虑公差）
    return createCircularFootprint(3.2, center);
}

/**
 * 创建引脚几何
 * 
 * @param width 引脚宽度（mm）
 * @param height 引脚高度（mm）
 * @param center 引脚中心位置
 * @returns 引脚几何
 */
export function createPinGeometry(width: number, height: number, center: Vector2): Rect {
    return createRectangularFootprint(width, height, center);
}

/**
 * 创建R0603的标准引脚
 * 
 * @param footprintCenter 封装中心位置
 * @returns 两个引脚的几何数组
 */
export function createR0603Pins(footprintCenter: Vector2 = Vector2.ORIGIN): { pin1: Rect; pin2: Rect } {
    // R0603引脚：0.8mm x 0.8mm，间距1.6mm
    const pinWidth = 0.8;
    const pinHeight = 0.8;
    const pinSpacing = 1.6;
    
    const pin1Center = new Vector2(footprintCenter.x - pinSpacing / 2, footprintCenter.y);
    const pin2Center = new Vector2(footprintCenter.x + pinSpacing / 2, footprintCenter.y);
    
    return {
        pin1: createPinGeometry(pinWidth, pinHeight, pin1Center),
        pin2: createPinGeometry(pinWidth, pinHeight, pin2Center)
    };
}

/**
 * 常用的PCB尺寸预设
 */
export const PCB_SIZES = {
    /** 标准小板：100mm x 80mm */
    STANDARD_SMALL: { width: 100, height: 80 },
    /** 标准中板：160mm x 100mm */
    STANDARD_MEDIUM: { width: 160, height: 100 },
    /** 标准大板：200mm x 160mm */
    STANDARD_LARGE: { width: 200, height: 160 },
    /** Arduino Uno尺寸：68.6mm x 53.4mm */
    ARDUINO_UNO: { width: 68.6, height: 53.4 },
    /** Raspberry Pi尺寸：85mm x 56mm */
    RASPBERRY_PI: { width: 85, height: 56 }
};

/**
 * 常用的封装尺寸预设
 */
export const FOOTPRINT_SIZES = {
    /** R0402: 1.0mm x 0.5mm */
    R0402: { width: 1.0, height: 0.5 },
    /** R0603: 1.6mm x 0.8mm */
    R0603: { width: 1.6, height: 0.8 },
    /** R0805: 2.0mm x 1.25mm */
    R0805: { width: 2.0, height: 1.25 },
    /** R1206: 3.2mm x 1.6mm */
    R1206: { width: 3.2, height: 1.6 },
    /** SOT23: 2.9mm x 1.3mm */
    SOT23: { width: 2.9, height: 1.3 },
    /** QFP64: 10mm x 10mm */
    QFP64: { width: 10, height: 10 }
};

/**
 * 常用的过孔尺寸预设
 */
export const VIA_SIZES = {
    /** 小过孔：0.2mm */
    SMALL: 0.2,
    /** 标准过孔：0.3mm */
    STANDARD: 0.3,
    /** 大过孔：0.5mm */
    LARGE: 0.5,
    /** 电源过孔：0.8mm */
    POWER: 0.8
};