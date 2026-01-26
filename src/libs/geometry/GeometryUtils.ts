import { Angle } from './Angle';
import { Arc } from './Arc';
import { Geometry2D } from './Geometry2D';
import { Line } from './Line';
import { Polyline } from './Polyline';
import { Vector2 } from './Vector2';

// 工具函数
export class GeometryUtils {
	/**
	 * 计算点到几何体的最近距离
	 */
	static distanceToGeometry(point: Vector2, geometry: Geometry2D): number {
		if (geometry instanceof Line) {
			return geometry.distanceToPoint(point);
		} else if (geometry instanceof Polyline) {
			return Math.min(
				...geometry.primitives.map(prim =>
					this.distanceToGeometry(
						point,
						prim
					)
				)
			);
		} else if (geometry instanceof Arc) {
			// 圆弧最近距离计算（简化版）
			const arc = geometry;
			const angle = Angle.betweenPoints(arc.center, point);
			if (arc.containsAngle(angle)) {
				const pointOnArc = arc.getPointAtAngle(angle);
				return point.distanceTo(pointOnArc);
			} else {
				return Math.min(
					point.distanceTo(
						arc.startPoint
					),
					point.distanceTo(arc.endPoint)
				);
			}
		}
		return Infinity;
	}

	/**
	 * 判断两个几何体是否相交
	 */
	static intersects(g1: Geometry2D, g2: Geometry2D): boolean {
		return g1.bounds.intersects(g2.bounds);
	}

	/**
	 * 从点数组创建折线
	 */
	static createPolylineFromPoints(points: Vector2[]): Polyline {
		if (points.length < 2) {
			throw new Error('At least 2 points are required to create a polyline');
		}

		const primitives: Line[] = [];
		for (let i = 0; i < points.length - 1; i++) {
			const p1 = points[i];
			const p2 = points[i + 1];
			if (p1 && p2) {
				primitives.push(new Line(p1, p2));
			}
		}

		return new Polyline(primitives);
	}
}
