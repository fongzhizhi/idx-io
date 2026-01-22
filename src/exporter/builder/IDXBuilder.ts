import {
	ECADData,
	ECADBoard,
	ECADLayer,
	ECADLayerStackup,
	ECADLayerZone,
	ECADFootprint,
	ECADComponent,
	ECADHole,
	ECADConstraintArea,
	ECADGeometry,
	ECADClosedGeometry,
	ECADOpenGeometry,
	ECADMeta,
	ECADNonCollaborativeData,
	ECADBend,
	ECADMillingPath,
	ECADTrace,
	ECADCopperArea,
	ECADSilkscreen,
	ECADConstraintPurpose,
	ECADLayerType,
	ECADModel3D,
	ECADObject,
} from '../../types/ecad/ecad.interface';
import {
	EDMDDataSet,
	EDMDDataSetBody,
	EDMDHeader,
	EDMDProcessInstruction,
	EDMDProcessInstructionSendInformation,
	EDMDIdentifier,
	EDMDObject,
	CartesianPoint,
	EDMDGeometry,
	EDMDCurveSet2D,
	EDMDShapeElement,
	EDMDStratum,
	EDMDModel3D,
	EDMDItemSingle,
	EDMDItemAssembly,
	EDMDHistory,
	EDMDHistoryEntry,
	EDMDTransformation,
	EDMDUserSimpleProperty,
	RoleOnItemInstance,
	GlobalUnit,
	IDXComputationalTag,
	EDMDLine,
	IDXD2Tag,
	EDMDBaseGeometry,
	EDMDArc,
	EDMDCircleCenter,
	EDMDPolyLine,
	EDMDCompositeCurve,
	ShapeElementType,
	ItemType,
	GeometryType,
	LayerPurpose,
	TechnologyType,
	EDMDItemInstance,
	EDMDName,
	UserSimpleProperty,
    EDMDZBounds,
} from '../../types/core';
import { Arc } from '../../libs/geometry/Arc';
import { Circle } from '../../libs/geometry/Circle';
import { Line } from '../../libs/geometry/Line';
import { Polyline } from '../../libs/geometry/Polyline';
import { Rect } from '../../libs/geometry/Rect';
import { Vector2 } from '../../libs/geometry/Vector2';
import { IDXBuildConfig } from '../../types/exporter/builder/idx-builder.interface';
import { DefaultIDXBuildConfig } from './config/idx-builder.config';
import { isValidBool } from '../../utils/object.utils';
import { iterateArr } from '../../utils/array.utils';
import { isNumeric, isValidNumber } from '../../utils/number.utils';
import { IDXBuilderIDPre } from '../../types/exporter/builder/idx-builder.types';

/**
 * IDX 模型构建器
 *
 * @remarks
 * 负责将ECAD系统数据转换为IDX格式数据集。
 * 实现ECADData到EDMDDataSet的完整转换逻辑。
 */
export class IDXBuilder {
	// ============= 状态量 =============
	// ------------ 私有变量 ------------
	private config = DefaultIDXBuildConfig;

	// ------------ 构建过程中的中间数据 ------------
	/** ID计数器表(idPre -> counter) */
	private idCounterMap = new Map<IDXBuilderIDPre, number>();
	/** 层数据映射表(ecadLayerId -> ECADLayer) */
	private layerMap = new Map<string, ECADLayer>();
	/** 层ID映射表(ecadLayerId -> idxLayerId) */
	private layerIdMap = new Map<string, string>();
	/** 层边界表(ecadLayerId -> EDMDZBounds) */
    private layerBoundsMap = new Map<string, EDMDZBounds>();
	/** 层堆叠ID映射表(ecadLayerStackId -> refName) */
	private layerStackupRefNameMap = new Map<string, string>();
	/** 点集合(pointHash -> CartesianPoint) */
	private pointMap = new Map<number, CartesianPoint>();
	/** 几何表(idxId -> EDMDGeometry) */
	private geometryMap = new Map<string, EDMDGeometry>();
	private curveSets: EDMDCurveSet2D[] = [];
	private shapeElements: EDMDShapeElement[] = [];
	private strata: EDMDStratum[] = [];
	private models3D: EDMDModel3D[] = [];
	private itemsSingle: EDMDItemSingle[] = [];
	private itemsAssembly: EDMDItemAssembly[] = [];
	private histories: EDMDHistory[] = [];

	/** IDX 模型构建器 */
	constructor(config?: Partial<IDXBuildConfig>) {
		if (config) {
			this.config = {
				...this.config,
				...config,
			};
		}
	}

	/**
	 * 构建完整的EDMDDataSet
	 *
	 * @param ecadData ECAD系统数据
	 * @returns 符合IDXv4.5协议的EDMD数据集
	 */
	public build(ecadData: ECADData): EDMDDataSet {
		// # 重置内部状态
		this.resetState();

		const metadata = ecadData.metadata;

		// # 处理头部信息
		const Header = this.buildHeader(metadata);

		// # 处理数据体
		const Body = this.buildBody(ecadData);

		// # 处理处理指令（默认为发送基线信息）
		const ProcessInstruction = this.buildProcessInstruction(metadata);

		this.resetState();
		return {
			Header,
			Body,
			ProcessInstruction,
		};
	}

	// ============= 构建相关基础函数 =============
	/**
	 * 重置构建器内部状态
	 */
	private resetState(): void {
		this.idCounterMap.clear();
		this.layerMap.clear();
		this.layerIdMap.clear();
		this.layerBoundsMap.clear();
		this.layerStackupRefNameMap.clear();
		this.pointMap.clear();
		this.geometryMap.clear();
		this.curveSets = [];
		this.shapeElements = [];
		this.strata = [];
		this.models3D = [];
		this.itemsSingle = [];
		this.itemsAssembly = [];
		this.histories = [];
	}

	/**
	 * 生成唯一ID
	 */
	private generateId(prefix: IDXBuilderIDPre): string {
		const idCounterMap = this.idCounterMap;
		if (!idCounterMap.has(prefix)) {
			idCounterMap.set(prefix, 0);
		}
		const nextIdCounter = (idCounterMap.get(prefix) || 0) + 1;

		idCounterMap.set(prefix, nextIdCounter);

		return `${prefix}_${nextIdCounter}`;
	}

	/**
	 * 提取公共属性
	 */
	private getCommonData(ecadObj: ECADObject): Partial<EDMDItemAssembly> {
		const itemBaseData: Partial<EDMDItemAssembly> = {};

		if (ecadObj.name) {
			itemBaseData.Name = ecadObj.name;
		}

		if (ecadObj.description) {
			itemBaseData.Description = ecadObj.description;
		}

		if (isValidBool(ecadObj.isAttrChanged)) {
			itemBaseData.IsAttributeChanged = ecadObj.isAttrChanged;
		}

		if (ecadObj.identifier) {
			itemBaseData.Identifier = ecadObj.identifier;
		}

		if (isValidBool(ecadObj.baseLine)) {
			itemBaseData.BaseLine = ecadObj.baseLine;
		}

		if (ecadObj.userProperties) {
			itemBaseData.UserProperties = ecadObj.userProperties;
		}

		if (ecadObj.roles) {
			itemBaseData.Roles = ecadObj.roles;
		}

		return itemBaseData;
	}

	/** 创建 EDMDName */
	private createEDMDName(objectName: string): EDMDName {
		return {
			SystemScope: this.config.systemScope,
			ObjectName: objectName,
		};
	}

	/** 创建自定义属性 */
	private craeteUserSimpleProperty(key: string, value: string | number | boolean, ext?: Partial<EDMDUserSimpleProperty>) {
		const userProp: EDMDUserSimpleProperty = {
			Key: this.createEDMDName(key),
			Value: value,
			...ext,
		};
		return userProp;
	}

    /**
     * 计算全局Z坐标范围
     * @param layerId 实例所在层
     * @param bounds 实例边界
     * @param assembleToName 引用的层名称
     * @param layerZBoundsMap 层注册表，包含所有层的Z坐标信息
     */
    private calculateGlobalZBounds(
        bounds: EDMDZBounds,
        assembleToName?: string,
        layerZBoundsMap?: Map<string, EDMDZBounds>
    ): EDMDZBounds {
        // # 判断是否使用了 assembleToName
        const referenceLayer = assembleToName && layerZBoundsMap?.get(assembleToName);

        // # 使用绝对坐标
        if (!referenceLayer) {
            return bounds;
        }
        
        // # 计算相对坐标
        // REF: 默认使用参考层的上表面作为基准（符合IDX惯例）
        const refZ = referenceLayer.UpperBound;
        return {
            LowerBound: bounds.LowerBound - refZ,
            UpperBound: bounds.UpperBound - refZ,
        };
    }

	// ============= 构建 Header =============
	/**
	 * 构建头部信息
	 *
	 * @remarks
	 * 根据ECAD元数据创建IDX头部信息。
	 * REF: Section 4, 5.1
	 */
	private buildHeader(metadata: ECADMeta): EDMDHeader {
		return {
			Description: metadata.description || `ECAD design: ${metadata.designName}`,
			CreatorName: metadata.creator.name,
			CreatorCompany: metadata.creator.company,
			CreatorSystem: metadata.creator.system,
			PostProcessorVersion: metadata.creator.version,
			Creator: metadata.creator.name,
			GlobalUnitLength: metadata.globalUnit,
			CreationDateTime: metadata.timestamps.created,
			ModifiedDateTime: metadata.timestamps.modified || metadata.timestamps.created,
		};
	}

	// ============= 构建 Body =============
	/**
	 * 构建数据体
	 *
	 * @remarks
	 * 处理所有 ECAD 实体并构建 IDX 数据体。
	 */
	private buildBody(ecadData: ECADData): EDMDDataSetBody {
		// # 处理层和层堆叠
		if (ecadData.layers && ecadData.stackups) {
			this.processLayersAndStackups(ecadData.layers, ecadData.stackups);
		}

		// # 处理板子
		this.processBoard(ecadData.board);

		// # 处理封装
		ecadData.footprints.forEach(footprint => {
			this.processFootprint(footprint);
		});

		// # 处理元件实例
		ecadData.components.forEach(component => {
			this.processComponent(component);
		});

		// # 处理孔和过孔
		ecadData.holes.forEach(hole => {
			this.processHole(hole);
		});

		// # 处理禁布区
		ecadData.constraints.forEach(constraint => {
			this.processConstraint(constraint);
		});

		// # 处理非协作数据（可选）
		if (this.config.includeNonCollaborative && ecadData.nonCollaborative) {
			this.processNonCollaborativeData(ecadData.nonCollaborative);
		}

		// # 返回完整数据集
		return this.assembleBody();
	}

	// ------------ 构建层数据 ------------
	/**
	 * 处理层和层堆叠
	 *
	 * @remarks
	 * REF: Section 6.1.2.1, 6.1.2.2
	 */
	private processLayersAndStackups(layers: ECADLayer[], stackups: ECADLayerStackup[]): void {
		// # 处理层定义
		layers.forEach(layer => {
			this.processLayer(layer);
		});

		// # 处理层堆叠
		stackups.forEach(stackup => {
			this.processLayerStackup(stackup, layers);
		});
	}

	/**
	 * 处理单个物理层
	 */
	private processLayer(layer: ECADLayer): void {
		const useSimplified = this.config.useSimplified;
		const {
			id: layerId,
			name: layerName,
			type: layerType,
			material: layerMaterial,
			color: layerColor,
		} = layer;

		// TODO: 数据检测

		// # 创建设计层装配
		const layerAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);

		// ## 层自定义属性
		const userProperties: EDMDUserSimpleProperty[] = [];
		if (layerMaterial) {
			userProperties.push(this.craeteUserSimpleProperty('Material', layerMaterial));
		}
		if (layerColor) {
			userProperties.push(this.craeteUserSimpleProperty('Color', layerColor));
		}

		const layerAssembly: EDMDItemAssembly = {
			...this.getCommonData(layer),
			id: layerAssemblyId,
			ItemType: ItemType.ASSEMBLY,
			geometryType: this.getLayerGeometryByLayerType(layerType),
			ReferenceName: layerName, // Note: 用于 AssembleToName 引用
			ItemInstances: [], // Design: 设计特点, 物理层虽然是 Assembly, 但不需要实例
			UserProperties: userProperties,
		};

		// ## 传统方式建模
		if (!useSimplified) {
			delete layerAssembly.geometryType;
			userProperties.push(
				this.craeteUserSimpleProperty(
					UserSimpleProperty.LayerType,
					this.getLayerPurposeByLayerType(
						layerType
					)
				)
			);
		}

		this.itemsAssembly.push(layerAssembly);
		this.layerMap.set(layerId, layer);
		this.layerIdMap.set(layerId, layerAssemblyId);
	}

	/**
	 * 根据层类型获取层GeometryType
	 *
	 * @param type ECAD层类型
	 * @returns 对应的IDX GeometryType
	 *
	 * @remarks
	 * 将ECAD系统的层类型映射到IDXv4.0+的geometryType属性
	 * REF: Section 6.1.2, Table 4 (层类型与GeometryType对应关系)
	 */
	private getLayerGeometryByLayerType(type: ECADLayerType): GeometryType {
		switch (type) {
			case ECADLayerType.SIGNAL:
			case ECADLayerType.POWER_GROUND:
				return GeometryType.LAYER_OTHERSIGNAL;
			case ECADLayerType.DIELECTRIC:
				return GeometryType.LAYER_DIELECTRIC;
			case ECADLayerType.SOLDERMASK:
				return GeometryType.LAYER_SOLDERMASK;
			case ECADLayerType.SILKSCREEN:
				return GeometryType.LAYER_SILKSCREEN;
			case ECADLayerType.SOLDERPASTE:
				return GeometryType.LAYER_SOLDERPASTE;
			case ECADLayerType.PASTEMASK:
				return GeometryType.LAYER_PASTEMASK;
			case ECADLayerType.GLUE:
				return GeometryType.LAYER_GLUE;
			case ECADLayerType.GLUEMASK:
				return GeometryType.LAYER_GLUEMASK;
			case ECADLayerType.EMBEDDED_CAP_DIELECTRIC:
				return GeometryType.LAYER_EMBEDDED_CAP_DIELECTRIC;
			case ECADLayerType.EMBEDDED_RESISTOR:
				return GeometryType.LAYER_EMBEDDED_RESISTOR;
			case ECADLayerType.GENERIC:
				return GeometryType.LAYER_GENERIC;
			case ECADLayerType.OTHER:
				return GeometryType.LAYER_GENERIC;

			default:
				console.warn(
					`未识别的层类型: ${type}, 使用默认 LAYER_GENERIC 类型`
				);
				return GeometryType.LAYER_GENERIC;
		}
	}

	/**
	 * 根据层类型获取层用途
	 *
	 * @param type ECAD层类型
	 * @returns 对应的LayerPurpose枚举值
	 *
	 * @remarks
	 * 将ECAD系统的层类型映射到IDX的LayerPurpose属性
	 * 用于传统方式（IDXv4.0之前）或StratumTechnology定义
	 * REF: Section 6.1.2, Table 4 (层类型与LayerPurpose对应关系)
	 */
	private getLayerPurposeByLayerType(type: ECADLayerType): LayerPurpose {
		switch (type) {
			case ECADLayerType.SIGNAL:
				return LayerPurpose.OTHERSIGNAL;
			case ECADLayerType.POWER_GROUND:
				return LayerPurpose.POWERGROUND;
			case ECADLayerType.DIELECTRIC:
				return LayerPurpose.DIELECTRIC;
			case ECADLayerType.SOLDERMASK:
				return LayerPurpose.SOLDERMASK;
			case ECADLayerType.SILKSCREEN:
				return LayerPurpose.SILKSCREEN;
			case ECADLayerType.SOLDERPASTE:
				return LayerPurpose.SOLDERPASTE;
			case ECADLayerType.PASTEMASK:
				return LayerPurpose.PASTEMASK;
			case ECADLayerType.GLUE:
				return LayerPurpose.GLUE;
			case ECADLayerType.GLUEMASK:
				return LayerPurpose.GLUEMASK;
			case ECADLayerType.EMBEDDED_CAP_DIELECTRIC:
				return LayerPurpose.EMBEDDED_CAP_DIELECTRIC;
			case ECADLayerType.EMBEDDED_RESISTOR:
				return LayerPurpose.EMBEDDED_RESISTOR;
			case ECADLayerType.GENERIC:
				return LayerPurpose.GENERIC;
			case ECADLayerType.OTHER:
				return LayerPurpose.GENERIC;
			default:
				console.warn(
					`未识别的层类型: ${type}, 使用默认 GENERIC 类型`
				);
				return LayerPurpose.GENERIC;
		}
	}

	/**
	 * 处理层堆叠
	 */
	private processLayerStackup(layerStackup: ECADLayerStackup, allLayers: ECADLayer[]): void {
		const layerMap = this.layerMap;
		const layerIdMap = this.layerIdMap;
		const { id: layerStackEcadId, name: layerStackName, layerIds } = layerStackup;

		// # 检测层数据是否存在和创建
		if (!layerIds || layerIds.length == 0) {
			return;
		}
		const usedLayerdMap = new Map<string, ECADLayer>();
		const hasValidLayer = iterateArr(layerIds, layerId => {
			const layer = layerMap.get(layerId);
			const layerIdxId = layerIdMap.get(layerId);
			if (!layer || !layerIdxId) {
				return true;
			}
			usedLayerdMap.set(layerIdxId, layer);
		});
		if (hasValidLayer || usedLayerdMap.size == 0) {
			return;
		}
		const useSimplified = this.config.useSimplified;

		// # 创建层堆叠装配
		const layerStackupId = this.generateId(IDXBuilderIDPre.ItemAssembly);

		// ## 创建层堆叠实例
		let nextLowerBound = 0; // Design: 从底面开始, 从 0 开始计算
		const itemInstances: EDMDItemInstance[] = [];
		usedLayerdMap.forEach((layer, layerIdxId) => {
			const { id: layerId, name: layerName, thickness } = layer;

            const layerBounds: EDMDZBounds = {
                LowerBound: nextLowerBound,
                UpperBound: nextLowerBound + thickness,
            };

			const userProperties: EDMDUserSimpleProperty[] = [];
			userProperties.push(
				this.craeteUserSimpleProperty(
					UserSimpleProperty.LowerBound,
					layerBounds.LowerBound
				)
			);
			userProperties.push(
                this.craeteUserSimpleProperty(
                    UserSimpleProperty.UpperBound,
					layerBounds.UpperBound
				)
			);
            nextLowerBound == layerBounds.UpperBound;

			const layerInstanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
			const layerInstance: EDMDItemInstance = {
				id: layerInstanceId,
				Item: layerIdxId,
				InstanceName: this.createEDMDName(layerName),
				UserProperties: userProperties,
			};
			itemInstances.push(layerInstance);

            this.layerBoundsMap.set(layerId, layerBounds);
		});

		// ## 层堆叠属性
		const totalThickness = nextLowerBound;
		const userProperties: EDMDUserSimpleProperty[] = [];
		userProperties.push(this.craeteUserSimpleProperty(UserSimpleProperty.TotalThickness, totalThickness));

        const layerStackRefName = layerStackName
		const layerStackupAssembly: EDMDItemAssembly = {
			Description: `Layer stackup: ${layerIds.length} layers`,
			...this.getCommonData(layerStackup),
			id: layerStackupId,
			Name: layerStackName,
			ItemType: ItemType.ASSEMBLY,
			geometryType: GeometryType.LAYER_STACKUP,
			ItemInstances: itemInstances,
			ReferenceName: layerStackRefName,
			UserProperties: userProperties,
		};

		// ## 传统方式建模
		if (!useSimplified) {
			delete layerStackupAssembly.geometryType;
		}

		this.itemsAssembly.push(layerStackupAssembly);
		this.layerStackupRefNameMap.set(layerStackEcadId, layerStackRefName);
	}

	// ------------ 构建几何数据 ------------
	/**
	 * 创建点
	 */
	private createPoint(point: Vector2): string {
		// # 检测点是否已存在
		const pointMap = this.pointMap;
		const pointHash = point.hash;
		const existingPoint = pointMap.get(pointHash);
		if (existingPoint) {
			return existingPoint.id;
		}

		// # 创建新点
		const pointId = this.generateId(IDXBuilderIDPre.Point);
		const cartesianPoint: CartesianPoint = {
			id: pointId,
			X: point.x,
			Y: point.y,
		};

		pointMap.set(pointHash, cartesianPoint);
		return pointId;
	}

	/**
	 * 处理直线几何
	 */
	private processLine(line: Line): string {
		// # 创建点
		const startPointId = this.createPoint(line.start);
		const endPointId = this.createPoint(line.end);

		// # 创建直线几何
		const lineId = this.generateId(IDXBuilderIDPre.Geometry);
		const lineGeometry: EDMDLine = {
			id: lineId,
			type: IDXD2Tag.EDMDLine,
			Point: startPointId,
			Vector: endPointId,
		};
		this.geometryMap.set(lineId, lineGeometry);

		return lineId;
	}

	/**
	 * 处理圆弧几何
	 */
	private processArc(arc: Arc): string {
		// # 判断Arc是否为圆
		const arcCircle = arc.tryToCircle();
		if (arcCircle) {
			return this.processCircle(arcCircle);
		}

		// # 创建三点圆弧
		const startPointId = this.createPoint(arc.startPoint);
		const midPointId = this.createPoint(arc.midPoint);
		const endPointId = this.createPoint(arc.endPoint);

		// # 创建圆弧几何
		const arcId = this.generateId(IDXBuilderIDPre.Geometry);
		const arcGeometry: EDMDArc = {
			id: arcId,
			type: IDXD2Tag.EDMDArc,
			StartPoint: startPointId,
			MidPoint: midPointId,
			EndPoint: endPointId,
		};
		this.geometryMap.set(arcId, arcGeometry);

		return arcId;
	}

	/**
	 * 处理圆形几何
	 */
	private processCircle(circle: Circle): string {
		// # 创建圆心点
		const centerPointId = this.createPoint(circle.center);

		// # 创建圆形几何
		const circleId = this.generateId(IDXBuilderIDPre.Geometry);
		const circleGeometry: EDMDCircleCenter = {
			id: circleId,
			type: IDXD2Tag.EDMDCircleCenter,
			CenterPoint: centerPointId,
			Diameter: circle.radius * 2,
		};
		this.geometryMap.set(circleId, circleGeometry);

		return circleId;
	}

	/**
	 * 处理复合曲线|多段线几何
	 */
	private processPolyline(polyline: Polyline, asClose?: boolean): string {
		if (asClose) {
			polyline = polyline.close();
		}

		// ## 判断复合曲线是否包含Arc
		const isContainArc = polyline.isContainArc;

		const geometryIds: string[] = [];
		if (isContainArc) {
			// ## 构建为复合曲线
			polyline.iteratePrimitives(item => {
				const geometryId = this.processGeometry(item);
				geometryIds.push(geometryId);
			});
		} else {
			// ## 构建普通折线
			polyline.vertices.forEach(point => {
				const pointId = this.createPoint(point);
				geometryIds.push(pointId);
			});
		}

		// ## 创建多复合曲线或多段线
		const polylineId = this.generateId(IDXBuilderIDPre.Geometry);
		let polylineGeometry: EDMDPolyLine | EDMDCompositeCurve;
		if (isContainArc) {
			polylineGeometry = {
				id: polylineId,
				type: IDXD2Tag.EDMDCompositeCurve,
				Curves: geometryIds,
			};
		} else {
			polylineGeometry = {
				id: polylineId,
				type: IDXD2Tag.EDMDPolyLine,
				Points: geometryIds,
			};
		}

		this.geometryMap.set(polylineId, polylineGeometry);

		return polylineId;
	}

	/**
	 * 处理矩形几何
	 */
	private processRect(rect: Rect): string {
		const polyline = rect.toPolyline();
		return this.processPolyline(polyline);
	}

	/**
	 * 处理几何对象
	 *
	 * @param geometry ECAD几何对象
	 * @returns 生成的IDX几何ID
	 */
	private processGeometry(geometry: ECADGeometry, asClose?: boolean): string {
		// 根据几何类型处理
		if (geometry instanceof Line) {
			return this.processLine(geometry);
		} else if (geometry instanceof Arc) {
			return this.processArc(geometry);
		} else if (geometry instanceof Circle) {
			return this.processCircle(geometry);
		} else if (geometry instanceof Polyline) {
			return this.processPolyline(geometry, asClose);
		} else if (geometry instanceof Rect) {
			return this.processRect(geometry);
		} else {
			throw new Error(`Unsupported geometry type: ${geometry}`);
		}
	}

	// ------------ 构建板子 ------------
	/**
	 * 处理PCB板
	 *
	 * @remarks
	 * 板子可以是简单板（厚度）或复杂板（层堆叠）。
	 * REF: Section 6.1
	 */
	private processBoard(board: ECADBoard): void {
        const useSimplified = this.config.useSimplified;
        const layerStackupRefNameMap = this.layerStackupRefNameMap;
        const { outline, thickness, stackupId, features, zones, bends } = board;
        const boardLayerStackRefName = stackupId && layerStackupRefNameMap.get(stackupId);

		// # 处理板轮廓几何
		const boardShapeId = this.processGeometry(outline, true);

		// # 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: ?,
			UpperBound: ?,
			DetailedGeometricModelElements: [boardShapeId],
		};
		this.curveSets.push(curveSet);

		// # 创建形状元素（板子轮廓，添加材料）
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: ShapeElementType.FeatureShapeElement,
			Inverted: false,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// # 处理板子特征（切割区域）
		if (board.features?.cutouts) {
			board.features.cutouts.forEach(cutout => {
				this.processBoardCutout(
					cutout,
					board.thickness || 1.6
				);
			});
		}

		// # 处理铣削路径
		if (board.features?.milling) {
			board.features.milling.forEach(milling => {
				this.processMillingPath(milling, board);
			});
		}

		// # 创建板子项目定义
		const boardSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const boardSingle: EDMDItemSingle = {
			id: boardSingleId,
			Name: board.name || 'PCB Board',
			Description: board.description || 'Main PCB board',
			ItemType: 'single',
			Identifier: board.identifier || this.createIdentifier('BOARD'),
			Shape: useSimplified
				? shapeElementId
				: this.createBoardStratum(shapeElementId),
			BaseLine: board.baseLine !== false, // 默认为基线
			...this.getCommonData(board),
		};

		// 如果使用传统方式，需要设置 Shape 为 Stratum
		if (!useSimplified) {
			boardSingle.Shape = this.createBoardStratum(shapeElementId);
		}

		this.itemsSingle.push(boardSingle);

		// # 创建板子装配实例
		const hasLayerStack = false; // TODO
		const boardAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const boardAssembly: EDMDItemAssembly = {
			...this.getCommonData(board),
			id: boardAssemblyId,
			ItemType: ItemType.ASSEMBLY,
			geometryType: AssembleToName
				? GeometryType.BOARD_AREA_RIGID
				: GeometryType.BOARD_OUTLINE,
			ItemInstances: [
				{
					id: this.generateId(
						IDXBuilderIDPre.ItemInstance
					),
					Item: boardSingleId,
					InstanceName:
						board.name ||
						'Board',
					Transformation: this.createTransformation2D(
						{
							x: 0,
							y: 0,
						},
						0
					),
					...this.extractInstanceProperties(
						board
					),
				},
			],
			AssembleToName,
		};

        // ## 传统方式建模
		if (!useSimplified) {
			delete boardAssembly.geometryType;
		}

		this.itemsAssembly.push(boardAssembly);

		// # 处理层区域（刚柔结合板）
		if (board.zones) {
			this.processLayerZones(board.zones);
		}

		// # 处理弯曲区域（柔性板）
		if (board.bends) {
			this.processBends(board.bends);
		}
	}

	/**
	 * 处理板子切割区域
	 */
	private processBoardCutout(cutout: ECADClosedGeometry, boardThickness: number): void {
		// 1. 处理切割几何
		const cutoutShapeId = this.processGeometry(cutout, 'CUTOUT');

		// 2. 创建曲线集（与板子相同Z范围）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: { Value: 0 },
			UpperBound: { Value: boardThickness },
			DetailedGeometricModelElement: cutoutShapeId,
		};
		this.curveSets.push(curveSet);

		// 3. 创建形状元素（切割，减去材料）
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: 'FeatureShapeElement',
			Inverted: true, // 减去材料
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 4. 创建切割项目（作为板子的子项）
		const cutoutSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const cutoutSingle: EDMDItemSingle = {
			id: cutoutSingleId,
			Name: 'Cutout',
			ItemType: 'single',
			Shape: shapeElementId,
		};
		this.itemsSingle.push(cutoutSingle);
	}

	/**
	 * 处理铣削路径
	 *
	 * @remarks
	 * REF: Section 6.4
	 */
	private processMillingPath(milling: ECADMillingPath, board: ECADBoard): void {
		// 1. 处理路径几何
		const pathShapeId = this.processGeometry(milling.path);

		// 2. 创建曲线集（指定深度范围）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: { Value: 0 },
			UpperBound: { Value: milling.depth || board.thickness || 1.6 },
			DetailedGeometricModelElement: pathShapeId,
		};
		this.curveSets.push(curveSet);

		// 3. 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: milling.isPlated
				? 'PartMountingFeature'
				: 'FeatureShapeElement',
			Inverted: true, // 减去材料
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 4. 创建铣削项目
		const millingSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const millingSingle: EDMDItemSingle = {
			id: millingSingleId,
			Name: 'Milled Cutout',
			ItemType: 'single',
			Shape: shapeElementId,
		};
		this.itemsSingle.push(millingSingle);

		// 5. 如果需要，可以创建铣削实例
	}

	/**
	 * 处理层区域
	 *
	 * @remarks
	 * REF: Section 6.1.2.3
	 */
	private processLayerZones(zones: ECADLayerZone[]): void {
		// TODO: 实现刚柔结合板的层区域
	}

	/**
	 * 处理弯曲区域
	 *
	 * @remarks
	 * REF: Section 6.1.2.4
	 */
	private processBends(bends: ECADBend[]): void {
		// TODO: 实现柔性板中的弯曲区域
	}

	/**
	 * 处理封装
	 *
	 * @remarks
	 * REF: Section 6.2
	 */
	private processFootprint(footprint: ECADFootprint): void {
		// 1. 处理封装轮廓几何
		const outlineShapeId = this.processGeometry(footprint.geometry.outline, 'FOOTPRINT_OUTLINE');

		// 2. 创建曲线集（封装高度通常为0，表示2D轮廓）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: { Value: 0 },
			UpperBound: { Value: 0 },
			DetailedGeometricModelElement: outlineShapeId,
		};
		this.curveSets.push(curveSet);

		// 3. 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: 'FeatureShapeElement',
			Inverted: false,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 4. 处理引脚
		const pinElements = footprint.pins
			.map(pin => {
				if (pin.geometry) {
					const pinShapeId =
						this.processGeometry(
							pin.geometry,
							'PIN'
						);
					return {
						pinNumber: pin.pinNumber,
						primary: pin.primary,
						position: pin.position,
						shapeId: pinShapeId,
					};
				}
				return null;
			})
			.filter(pin => pin !== null);

		// 5. 创建封装项目定义（Item single）
		const footprintSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const footprintSingle: EDMDItemSingle = {
			id: footprintSingleId,
			Name: footprint.name || footprint.packageName,
			Description: footprint.description || `Footprint: ${footprint.packageName}`,
			ItemType: 'single',
			Identifier:
				footprint.identifier ||
				this.createIdentifier(
					`FOOTPRINT_${footprint.packageName}`
				),
			PackageName: {
				SystemScope: this.config.systemScope,
				ObjectName: footprint.packageName,
			},
			Shape: shapeElementId,
			BaseLine: footprint.baseLine !== false,
			...this.getCommonData(footprint),
		};

		// 添加引脚信息（IDXv4.0简化方式）
		if (pinElements.length > 0 && this.config.useSimplifiedFormat) {
			// 这里可以添加PackagePin属性
		}

		this.itemsSingle.push(footprintSingle);

		// 6. 创建封装实例（Item assembly） - 封装本身通常不需要实例，由元件实例引用
		// 这里我们创建封装实例以便于组织
		const footprintAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const footprintAssembly: EDMDItemAssembly = {
			id: footprintAssemblyId,
			Name: footprint.name || footprint.packageName,
			ItemType: 'assembly',
			geometryType: 'COMPONENT', // 封装本质上是组件定义
			ItemInstance: [
				{
					id: this.generateId(
						IDXBuilderIDPre.ItemInstance
					),
					Item: footprintSingleId,
					InstanceName: footprint.packageName,
				},
			],
			...this.getCommonData(footprint),
		};

		this.itemsAssembly.push(footprintAssembly);

		// 保存ID映射
		if (footprint.identifier) {
			this.idMap.set(
				footprint.identifier.SystemScope +
					footprint.identifier.Number,
				footprintAssemblyId
			);
		}
	}

	/**
	 * 处理元件实例
	 *
	 * @remarks
	 * REF: Section 6.2.1
	 */
	private processComponent(component: ECADComponent): void {
		// 1. 找到对应的封装
		const footprintAssembly = this.itemsAssembly.find(
			ia =>
				ia.Name === component.footprintId ||
				(component.identifier &&
					this.idMap.has(
						component
							.identifier
							.SystemScope +
							component
								.identifier
								.Number
					))
		);

		if (!footprintAssembly) {
			console.warn(`Footprint not found for component: ${component.refDes}`);
			return;
		}

		// 2. 创建元件实例（Item assembly）
		const componentAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const geometryType = component.refDes.startsWith('M') ? 'COMPONENT_MECHANICAL' : 'COMPONENT';

		const componentAssembly: EDMDItemAssembly = {
			id: componentAssemblyId,
			Name: component.name || component.refDes,
			Description: component.description || `Component: ${component.refDes}`,
			ItemType: 'assembly',
			geometryType: geometryType,
			ItemInstance: [
				{
					id: this.generateId(
						IDXBuilderIDPre.ItemInstance
					),
					Item: footprintAssembly.id,
					InstanceName: component.refDes,
					Transformation: this.createTransformation2D(
						component
							.transformation
							.position,
						component
							.transformation
							.rotation,
						component
							.transformation
							.mirror
					),
					UserProperties: [
						{
							Key: {
								SystemScope: this
									.config
									.systemScope,
								ObjectName: 'REFDES',
							},
							Value: component.refDes,
						},
						...(component.partNumber
							? [
									{
										Key: {
											SystemScope: this
												.config
												.systemScope,
											ObjectName: 'PARTNUM',
										},
										Value: component.partNumber,
									},
								]
							: []),
						...(component.value
							? [
									{
										Key: {
											SystemScope: this
												.config
												.systemScope,
											ObjectName: 'VALUE',
										},
										Value: component.value,
									},
								]
							: []),
					],
				},
			],
			AssembleToName: component.assembleTo,
			...(component.zOffset !== undefined ? { zOffset: component.zOffset } : {}),
			BaseLine: component.baseLine !== false,
			...this.getCommonData(component),
		};

		// 3. 处理3D模型引用
		if (component.model3d) {
			const model3dId = this.processModel3D(component.model3d);
			// 将3D模型关联到元件
			// 这里需要更新对应的Item single
		}

		this.itemsAssembly.push(componentAssembly);
	}

	/**
	 * 处理孔和过孔
	 *
	 * @remarks
	 * REF: Section 6.3
	 */
	private processHole(hole: ECADHole): void {
		// 1. 处理孔几何
		const holeShapeId = this.processGeometry(hole.geometry, 'HOLE');

		// 2. 确定Z范围
		let lowerBound = 0;
		let upperBound = 0;

		if (hole.zRange) {
			lowerBound = hole.zRange.lowerBound || 0;
			upperBound = hole.zRange.upperBound || 0;
		} else if (hole.stackupId) {
			// 从层堆叠计算范围
			// 这里简化处理
			upperBound = 1.6; // 默认板厚
		}

		// 3. 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: { Value: lowerBound },
			UpperBound: { Value: upperBound },
			DetailedGeometricModelElement: holeShapeId,
		};
		this.curveSets.push(curveSet);

		// 4. 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: hole.isMilled
				? 'PartMountingFeature'
				: 'FeatureShapeElement',
			Inverted: hole.type === 'NPTH' ? false : true, // 非电镀孔为添加材料？需要确认
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 5. 确定geometryType
		let geometryType: string;
		if (hole.isMilled) {
			geometryType =
				hole.type === 'PTH'
					? 'HOLE_PLATED_MILLED'
					: 'HOLE_NONPLATED_MILLED';
		} else {
			geometryType =
				hole.type === 'PTH'
					? 'HOLE_PLATED'
					: hole.type === 'NPTH'
						? 'HOLE_NON_PLATED'
						: hole.type ===
							  'VIA'
							? 'VIA'
							: hole.type ===
								  'FILLED_VIA'
								? 'FILLED_VIA'
								: 'HOLE_PLATED';
		}

		// 6. 创建孔项目定义（Item single）
		const holeSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const holeSingle: EDMDItemSingle = {
			id: holeSingleId,
			Name: hole.name || `Hole ${hole.type}`,
			Description: hole.description || `${hole.type} hole`,
			ItemType: 'single',
			Identifier: hole.identifier || this.createIdentifier(`HOLE_${hole.type}`),
			Shape: shapeElementId,
			BaseLine: hole.baseLine !== false,
			...this.getCommonData(hole),
		};

		// 添加焊盘堆叠名称
		if (hole.padstackName) {
			holeSingle.PackageName = {
				SystemScope: this.config.systemScope,
				ObjectName: hole.padstackName,
			};
		}

		this.itemsSingle.push(holeSingle);

		// 7. 创建孔实例（Item assembly）
		const holeAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const holeAssembly: EDMDItemAssembly = {
			id: holeAssemblyId,
			Name: hole.name || `Hole ${hole.type}`,
			ItemType: 'assembly',
			geometryType: geometryType,
			ItemInstance: [
				{
					id: this.generateId(
						IDXBuilderIDPre.ItemInstance
					),
					Item: holeSingleId,
					InstanceName:
						hole.name ||
						`Hole_${this.idCounterMap}`,
					Transformation: this.createTransformation2D(
						{
							x: 0,
							y: 0,
						},
						0
					), // 孔的位置在几何中定义
				},
			],
			AssembleToName: hole.stackupId || hole.layerSpan?.startLayer,
			BaseLine: hole.baseLine !== false,
			...this.getCommonData(hole),
		};

		this.itemsAssembly.push(holeAssembly);
	}

	/**
	 * 处理禁布区/保持区
	 *
	 * @remarks
	 * REF: Section 6.5
	 */
	private processConstraint(constraint: ECADConstraintArea): void {
		// 1. 处理约束几何
		const constraintShapeId = this.processGeometry(constraint.geometry, 'CONSTRAINT');

		// 2. 确定Z范围
		let lowerBound = constraint.zRange?.lowerBound;
		let upperBound = constraint.zRange?.upperBound;

		// 3. 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			...(lowerBound !== undefined ? { LowerBound: { Value: lowerBound } } : {}),
			...(upperBound !== undefined ? { UpperBound: { Value: upperBound } } : {}),
			DetailedGeometricModelElement: constraintShapeId,
		};
		this.curveSets.push(curveSet);

		// 4. 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: 'FeatureShapeElement',
			Inverted: false, // 约束区域通常不反转
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 5. 确定geometryType
		const geometryType = this.getConstraintGeometryType(constraint.type, constraint.purpose);

		// 6. 创建约束项目定义（Item single）
		const constraintSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const constraintSingle: EDMDItemSingle = {
			id: constraintSingleId,
			Name: constraint.name || `${constraint.type} ${constraint.purpose}`,
			Description:
				constraint.description ||
				`${constraint.type} area for ${constraint.purpose}`,
			ItemType: 'single',
			Identifier:
				constraint.identifier ||
				this.createIdentifier(
					`${constraint.type}_${constraint.purpose}`
				),
			Shape: shapeElementId,
			BaseLine: constraint.baseLine !== false,
			...this.getCommonData(constraint),
		};

		this.itemsSingle.push(constraintSingle);

		// 7. 创建约束实例（Item assembly）
		const constraintAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const constraintAssembly: EDMDItemAssembly = {
			id: constraintAssemblyId,
			Name: constraint.name || `${constraint.type} ${constraint.purpose}`,
			ItemType: 'assembly',
			geometryType: geometryType,
			ItemInstance: [
				{
					id: this.generateId(
						IDXBuilderIDPre.ItemInstance
					),
					Item: constraintSingleId,
					InstanceName:
						constraint.name ||
						`${constraint.type}_${this.idCounterMap}`,
					Transformation: this.createTransformation2D(
						{
							x: 0,
							y: 0,
						},
						0
					),
				},
			],
			AssembleToName: constraint.assembleTo,
			BaseLine: constraint.baseLine !== false,
			...this.getCommonData(constraint),
		};

		this.itemsAssembly.push(constraintAssembly);
	}

	/**
	 * 处理非协作数据
	 */
	private processNonCollaborativeData(data: ECADNonCollaborativeData): void {
		// # 处理走线
		if (data.traces) {
			data.traces.forEach(trace => {
				this.processTrace(trace);
			});
		}

		// # 处理铜皮区域
		if (data.copperAreas) {
			data.copperAreas.forEach(area => {
				this.processCopperArea(area);
			});
		}

		// # 处理丝印
		if (data.silkscreen) {
			data.silkscreen.forEach(silkscreen => {
				this.processSilkscreen(silkscreen);
			});
		}
	}

	/**
	 * 处理走线
	 */
	private processTrace(trace: ECADTrace): void {
		// 走线作为非协作数据，通常不参与ECAD/MCAD协作
		// 这里可以创建简单的表示
		const traceShapeId = this.processGeometry(trace.geometry, 'TRACE');

		// 创建曲线集（走线有厚度）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: { Value: 0 },
			UpperBound: { Value: 0.035 }, // 典型走线高度
			DetailedGeometricModelElement: traceShapeId,
		};
		this.curveSets.push(curveSet);

		// 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: 'FeatureShapeElement',
			Inverted: false,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 创建层技术（用于标识走线层）
		const technologyId = TODO; // 获取层ID

		// 创建Stratum
		const stratumId = this.generateId(IDXBuilderIDPre.Stratum);
		const stratum: EDMDStratum = {
			id: stratumId,
			ShapeElement: shapeElementId,
			StratumTechnology: technologyId,
			StratumType: 'DesignLayerStratum',
		};
		this.strata.push(stratum);

		// 创建走线项目
		const traceSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const traceSingle: EDMDItemSingle = {
			id: traceSingleId,
			Name: `Trace ${trace.netName || ''}`,
			ItemType: 'single',
			Shape: stratumId,
			UserProperties: [
				{
					Key: {
						SystemScope: this
							.config
							.systemScope,
						ObjectName: 'SIDE',
					},
					Value: trace.layer.includes(
						'TOP'
					)
						? 'TOP'
						: 'BOTTOM',
				},
				...(trace.netName
					? [
							{
								Key: {
									SystemScope: this
										.config
										.systemScope,
									ObjectName: 'NET',
								},
								Value: trace.netName,
							},
						]
					: []),
			],
		};
		this.itemsSingle.push(traceSingle);
	}

	/**
	 * 处理铜皮区域
	 */
	private processCopperArea(area: ECADCopperArea): void {
		const areaShapeId = this.processGeometry(area.geometry, 'COPPER_AREA');

		// 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: { Value: 0 },
			UpperBound: { Value: 0.035 }, // 典型铜厚
			DetailedGeometricModelElement: areaShapeId,
		};
		this.curveSets.push(curveSet);

		// 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: 'FeatureShapeElement',
			Inverted: false,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 创建层技术
		const technologyId = TODO;

		// 创建Stratum
		const stratumId = this.generateId(IDXBuilderIDPre.Stratum);
		const stratum: EDMDStratum = {
			id: stratumId,
			ShapeElement: shapeElementId,
			StratumTechnology: technologyId,
			StratumType: 'DesignLayerStratum',
		};
		this.strata.push(stratum);

		// 创建铜皮项目
		const areaSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const areaSingle: EDMDItemSingle = {
			id: areaSingleId,
			Name: `Copper Area`,
			ItemType: 'single',
			Shape: stratumId,
			UserProperties: [
				{
					Key: {
						SystemScope: this
							.config
							.systemScope,
						ObjectName: 'SIDE',
					},
					Value: area.layer.includes(
						'TOP'
					)
						? 'TOP'
						: 'BOTTOM',
				},
			],
		};
		this.itemsSingle.push(areaSingle);
	}

	/**
	 * 处理丝印
	 */
	private processSilkscreen(silkscreen: ECADSilkscreen): void {
		const silkscreenShapeId = this.processGeometry(silkscreen.geometry, 'SILKSCREEN');

		// 创建曲线集（丝印很薄）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: { Value: 0 },
			UpperBound: { Value: 0.01 }, // 典型丝印厚度
			DetailedGeometricModelElement: silkscreenShapeId,
		};
		this.curveSets.push(curveSet);

		// 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: 'FeatureShapeElement',
			Inverted: false,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// 创建层技术
		const technologyId = TODO;

		// 创建Stratum
		const stratumId = this.generateId(IDXBuilderIDPre.Stratum);
		const stratum: EDMDStratum = {
			id: stratumId,
			ShapeElement: shapeElementId,
			StratumTechnology: technologyId,
			StratumType: 'DesignLayerStratum',
		};
		this.strata.push(stratum);

		// 创建丝印项目
		const silkscreenSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const silkscreenSingle: EDMDItemSingle = {
			id: silkscreenSingleId,
			Name: `Silkscreen ${silkscreen.text || ''}`,
			ItemType: 'single',
			Shape: stratumId,
			UserProperties: [
				{
					Key: {
						SystemScope: this
							.config
							.systemScope,
						ObjectName: 'SIDE',
					},
					Value: silkscreen.layer.includes(
						'TOP'
					)
						? 'TOP'
						: 'BOTTOM',
				},
				...(silkscreen.text
					? [
							{
								Key: {
									SystemScope: this
										.config
										.systemScope,
									ObjectName: 'TEXT',
								},
								Value: silkscreen.text,
							},
						]
					: []),
			],
		};
		this.itemsSingle.push(silkscreenSingle);
	}

	/**
	 * 处理3D模型
	 */
	private processModel3D(model: ECADModel3D): string {
		const modelId = this.generateId(IDXBuilderIDPre.Model);
		const idxModel: EDMDModel3D = {
			id: modelId,
			ModelIdentifier: model.identifier,
			MCADFormat: this.convertModelFormat(model.format),
			...(model.version && { ModelVersion: model.version }),
			...(model.location && { ModelLocation: model.location }),
			...(model.transformation && { Transformation: model.transformation }),
		};

		this.models3D.push(idxModel);
		return modelId;
	}

	/**
	 * 创建板子Stratum（传统方式）
	 */
	private createBoardStratum(shapeElementId: string): string {
		const stratumId = this.generateId(IDXBuilderIDPre.Stratum);
		const stratum: EDMDStratum = {
			id: stratumId,
			ShapeElement: shapeElementId,
			StratumType: 'DesignLayerStratum',
			StratumSurfaceDesignation: 'PrimarySurface',
		};

		this.strata.push(stratum);
		return stratumId;
	}

	/**
	 * 创建2D变换
	 */
	private createTransformation2D(position: Vector2, rotation: number, mirror?: boolean): EDMDTransformation {
		const cos = Math.cos(rotation);
		const sin = Math.sin(rotation);

		// 如果镜像，调整变换矩阵
		const xx = mirror ? -cos : cos;
		const xy = mirror ? sin : -sin;

		return {
			TransformationType: 'd2',
			xx: xx,
			xy: xy,
			yx: sin,
			yy: cos,
			tx: { Value: position.x },
			ty: { Value: position.y },
		};
	}

	/**
	 * 创建标识符
	 */
	private createIdentifier(baseName: string): EDMDIdentifier {
		return {
			SystemScope: this.config.systemScope,
			Number: `${baseName}_${this.idCounterMap++}`,
			Version: '1',
			Revision: '0',
			Sequence: '0',
		};
	}

	/**
	 * 获取区域类型的geometryType
	 */
	private getZoneGeometryType(zoneType: 'RIGID' | 'FLEXIBLE' | 'STIFFENER'): string {
		switch (zoneType) {
			case 'FLEXIBLE':
				return 'BOARD_AREA_FLEXIBLE';
			case 'STIFFENER':
				return 'BOARD_AREA_STIFFENER';
			default:
				return 'BOARD_AREA_RIGID';
		}
	}

	/**
	 * 获取约束类型的geometryType
	 */
	private getConstraintGeometryType(type: 'KEEPOUT' | 'KEEPIN', purpose: ECADConstraintPurpose): string {
		const prefix = type === 'KEEPOUT' ? 'KEEPOUT_AREA' : 'KEEPIN_AREA';

		switch (purpose) {
			case 'ROUTE':
				return `${prefix}_ROUTE`;
			case 'COMPONENT':
				return `${prefix}_COMPONENT`;
			case 'VIA':
				return `${prefix}_VIA`;
			case 'TESTPOINT':
				return `${prefix}_TESTPOINT`;
			case 'THERMAL':
				return `${prefix}_THERMAL`;
			case 'OTHER':
				return `${prefix}_OTHER`;
			default:
				return `${prefix}_OTHER`;
		}
	}

	/**
	 * 转换模型格式
	 */
	private convertModelFormat(format: ECADModel3D['format']): EDMDModel3D['MCADFormat'] {
		const mapping: Record<ECADModel3D['format'], EDMDModel3D['MCADFormat']> = {
			STEP: 'STEP',
			STL: 'STL',
			IGES: 'Catia', // IGES通常与Catia关联
			PARASOLID: 'SolidEdge',
			SOLIDWORKS: 'SolidWorks',
			NX: 'NX',
			CATIA: 'Catia',
		};

		return mapping[format] || 'STEP';
	}

	/**
	 * 组装数据体
	 */
	private assembleBody(): EDMDDataSetBody {
		const Body: EDMDDataSetBody = {};

		// 只包含非空的数组
		if (this.pointMap.length > 0) Body.Points = this.pointMap;
		if (this.geometryMap.length > 0) Body.Geometries = this.geometryMap;
		if (this.curveSets.length > 0) Body.CurveSets = this.curveSets;
		if (this.shapeElements.length > 0) Body.ShapeElements = this.shapeElements;
		if (this.stratumTechnologies.length > 0) Body.StratumTechnologies = this.stratumTechnologies;
		if (this.strata.length > 0) Body.Strata = this.strata;
		if (this.models3D.length > 0) Body.Models3D = this.models3D;
		if (this.itemsSingle.length > 0) Body.ItemsSingle = this.itemsSingle;
		if (this.itemsAssembly.length > 0) Body.ItemsAssembly = this.itemsAssembly;
		if (this.histories.length > 0) Body.Histories = this.histories;

		return Body;
	}

	// ============= 构建 ProcessInstruction =============
	/**
	 * 构建处理指令
	 */
	private buildProcessInstruction(metadata: ECADMeta): EDMDProcessInstruction {
		const instruction: EDMDProcessInstructionSendInformation = {
			type: IDXComputationalTag.SendInformation,
			Actor: metadata.creator.name,
			Description: `Baseline for design: ${metadata.designName}`,
		};

		return instruction;
	}
}
