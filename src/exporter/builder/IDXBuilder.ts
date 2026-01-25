import { Arc } from '../../libs/geometry/Arc';
import { Circle } from '../../libs/geometry/Circle';
import { GeometryKind } from '../../libs/geometry/Geometry2D';
import { Line } from '../../libs/geometry/Line';
import { Polyline } from '../../libs/geometry/Polyline';
import { Rect } from '../../libs/geometry/Rect';
import { Vector2 } from '../../libs/geometry/Vector2';
import {
	ECADLayer,
	ECADLayerStackup,
	ECADData,
	ECADObject,
	ECADTransformation2D,
	ECADMeta,
	ECADLayerType,
	ECADGeometry,
	ECADBoard,
	ECADClosedGeometry,
	ECADMillingPath,
	ECADLayerZone,
	ECADBend,
	ECADModel3D,
	ECADModelFormat,
	ECADFootprint,
	ECADComponent,
	ECADHole,
	ECADHoleType,
	ECADConstraintArea,
	ECADConstraintPurpose,
	ECADNonCollaborativeData,
	ECADTrace,
	ECADCopperArea,
	ECADSilkscreen,
} from '../../types/ecad/ecad.interface';
import {
	EDMDIdentifier,
	EDMDName,
	EDMDUserSimpleProperty,
	EDMDTransformation,
	UserSimpleProperty,
	EDMDCartesianPoint,
} from '../../types/edmd/base.types';
import {
	EDMDHistory,
	EDMDDataSet,
	EDMDHeader,
	EDMDDataSetBody,
	EDMDProcessInstruction,
	EDMDProcessInstructionSendInformation,
} from '../../types/edmd/dataset.types';
import {
	EDMDZBounds,
	EDMDGeometry,
	EDMDCurveSet2D,
	EDMDLine,
	EDMDArc,
	EDMDCircleCenter,
	EDMDPolyLine,
	EDMDCompositeCurve,
} from '../../types/edmd/geometry.types';
import { EDMDItemSingle, EDMDItemAssembly, ItemType, EDMDItemInstance, EDMPackagePin } from '../../types/edmd/item.types';
import { EDMDModel3D } from '../../types/edmd/model3d.types';
import { IDXD2Tag, IDXComputationalTag } from '../../types/edmd/namespace.types';
import {
	EDMDShapeElement,
	EDMDStratum,
	LayerPurpose,
	ShapeElementType,
	StratumType,
	StratumSurfaceDesignation,
} from '../../types/edmd/shape-element.types';
import { IDXBuildConfig } from '../../types/exporter/builder/idx-builder.interface';
import { IDXBuilderIDPre } from '../../types/exporter/builder/idx-builder.types';
import { iterateArr } from '../../utils/array.utils';
import { isValidBool, iterateObject } from '../../utils/object.utils';
import { DefaultIDXBuildConfig } from './config/idx-builder.config';

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
	/** 标识符Number计数器表(idNumberPre -> counter) */
	private idNumberCounterMap = new Map<string, number>();

	/** 层信息表(ecadLayerId -> ECADLayer) */
	private layerMap = new Map<string, ECADLayer>();
	/** 层堆叠信息表(ecadLayerStackId -> ECADLayerStackup) */
	private layerStackMap = new Map<string, ECADLayerStackup>();
	/** 层ID映射表(ecadLayerId -> idxLayerId) */
	private layerIdMap = new Map<string, string>();
	/** 层堆叠边界表(ecadLayerStackId-> (ecadLayerId -> EDMDZBounds)) */
	private layerStackBoundsMap = new Map<string, Map<string, EDMDZBounds>>();
	/** 层堆叠厚度表(ecadLayerStackId-> thickness) */
	private layerStackThicknessMap = new Map<string, number>();
	/** 板子层堆叠ID */
	private boardLayerStackId: string | undefined;

	/** 3D模型ID表(modelId -> IdxModelId) */
	private model3DIdMap = new Map<string, string>();
	/** 封装表(packageName -> FootprintSingle) */
	private footprintSingleMap = new Map<string, EDMDItemSingle>();

	/** 点集合(pointHash -> EDMDCartesianPoint) */
	private pointMap = new Map<number, EDMDCartesianPoint>();
	/** 几何表(idxId -> EDMDGeometry) */
	private geometryMap = new Map<string, EDMDGeometry>();
	/** 曲线集集合 */
	private curveSets: EDMDCurveSet2D[] = [];

	/** 形状元素集合 */
	private shapeElements: EDMDShapeElement[] = [];
	/** 形状层次集合(传统方式建模) */
	private strata: EDMDStratum[] = [];

	/** 项目定义集合 */
	private itemsSingle: EDMDItemSingle[] = [];
	/** 项目装配集合 */
	private itemsAssembly: EDMDItemAssembly[] = [];

	/** 历史记录集合 */
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

	// ============= 构建相关通用函数 =============
	/**
	 * 重置构建器内部状态
	 */
	private resetState(): void {
		this.idCounterMap.clear();
		this.idNumberCounterMap.clear();

		this.layerMap.clear();
		this.layerStackMap.clear();
		this.layerIdMap.clear();
		this.layerStackBoundsMap.clear();
		this.layerStackThicknessMap.clear();
		this.boardLayerStackId = '';

		this.model3DIdMap.clear();
		this.footprintSingleMap.clear();

		this.pointMap.clear();
		this.geometryMap.clear();
		this.curveSets = [];

		this.shapeElements = [];
		this.strata = [];

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
	 * 生成唯一标识符Number
	 */
	private generateIdentifierNumber(prefix: string): string {
		const idNumberCounterMap = this.idNumberCounterMap;
		if (!idNumberCounterMap.has(prefix)) {
			idNumberCounterMap.set(prefix, 0);
		}
		const nextIdCounter = (idNumberCounterMap.get(prefix) || 0) + 1;

		idNumberCounterMap.set(prefix, nextIdCounter);

		return `${prefix}_${nextIdCounter}`;
	}

	/**
	 * 创建标识符
	 */
	private createIdentifier(prefix: string): EDMDIdentifier {
		return {
			SystemScope: this.config.systemScope,
			Number: this.generateIdentifierNumber(prefix),
			Version: 1,
			Revision: 0,
			Sequence: 0,
		};
	}

	/**
	 * 提取公共属性
	 */
	private getCommonData(ecadObj: ECADObject): Partial<EDMDItemAssembly> {
		const { name, description, isAttrChanged, identifier, baseLine, userProperties, roles } = ecadObj;
		const itemBaseData: Partial<EDMDItemAssembly> = {};

		if (name) {
			itemBaseData.Name = name;
		}

		if (description) {
			itemBaseData.Description = description;
		}

		if (isValidBool(isAttrChanged)) {
			itemBaseData.IsAttributeChanged = isAttrChanged;
		}

		if (identifier) {
			itemBaseData.Identifier = identifier;
		}

		if (isValidBool(baseLine)) {
			itemBaseData.BaseLine = baseLine;
		}

		if (userProperties) {
			itemBaseData.UserProperties = userProperties;
		}

		if (roles) {
			itemBaseData.Roles = roles;
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

	/** 获取层名称 */
	private getLayerName(layerId: string) {
		return layerId && this.layerMap.get(layerId)?.name;
	}

	/** 获取堆叠层名称 */
	private getLayerStackName(layerStackId?: string) {
		return layerStackId && this.layerStackMap.get(layerStackId)?.name;
	}

	/** 获取层边界 */
	private getLayerBounds(layerId: string, layerStackId?: string) {
		if (!layerStackId) {
			layerStackId = this.boardLayerStackId;
		}
		return layerStackId ? this.layerStackBoundsMap.get(layerStackId)?.get(layerId) : undefined;
	}

	/** 获取堆叠层厚度 */
	private getlayerStackThickness(layerStackId: string, thickness: number) {
		return this.layerStackThicknessMap.get(layerStackId) || thickness;
	}

	/**
	 * 计算Z坐标范围
	 * @param layerId 实例所在层
	 * @param assembleToName 引用的层名称
	 * @param layerZBoundsMap 层注册表，包含所有层的Z坐标信息
	 */
	private calculateZBounds(
		layerId: string,
		layerStackId?: string,
		assembleToName?: string,
		layerZBoundsMap?: Map<string, EDMDZBounds>
	): EDMDZBounds | undefined {
		const layerBounds = this.getLayerBounds(layerId, layerStackId);

		// # 判断是否使用了 assembleToName
		const referenceLayer = assembleToName && layerZBoundsMap?.get(assembleToName);

		// # 使用绝对坐标
		if (!referenceLayer) {
			return layerBounds;
		}

		// # 计算相对坐标
		// REF: 默认使用参考层的上表面作为基准（符合IDX惯例）
		const refZ = referenceLayer.UpperBound;
		return {
			LowerBound: bounds.LowerBound - refZ,
			UpperBound: bounds.UpperBound - refZ,
		};
	}

	/**
	 * 创建2D变换
	 */
	private createTransformation2D(transformation: ECADTransformation2D): EDMDTransformation {
		const { position, rotation, mirror } = transformation;
		const { x, y } = position;

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
			tx: x,
			ty: y,
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
		const { includeNonCollaborative } = this.config;
		const {
			layers,
			stackups,
			board,
			models,
			footprints,
			components,
			holes,
			constraints,
			nonCollaborative,
		} = ecadData;

		// # 处理层和层堆叠
		if (layers && stackups) {
			this.processLayersAndStackups(layers, stackups);
		}

		// # 处理板子
		this.processBoard(board);

		// # 处理3D模型
		iterateObject(models, model3D => {
			this.processModel3D(model3D);
		});

		// # 处理封装
		iterateObject(footprints, footprint => {
			this.processFootprint(footprint);
		});

		// # 处理元件实例
		components.forEach(component => {
			this.processComponent(component);
		});

		// # 处理孔和过孔
		holes.forEach(hole => {
			this.processHole(hole);
		});

		// # 处理禁布区
		constraints.forEach(constraint => {
			this.processConstraint(constraint);
		});

		// # 处理非协作数据（可选）
		if (includeNonCollaborative && nonCollaborative) {
			this.processNonCollaborativeData(nonCollaborative);
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
	private processLayersAndStackups(layers: Record<string, ECADLayer>, stackups: Record<string, ECADLayerStackup>): void {
		// # 处理层定义
		iterateObject(layers, layer => {
			this.processLayer(layer);
		});

		// # 处理层堆叠
		iterateObject(stackups, layerStack => {
			this.processLayerStackup(layerStack);
		});
	}

	/**
	 * 处理单个物理层
	 */
	private processLayer(layer: ECADLayer): void {
		const { useSimplified } = this.config;
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
	private getLayerGeometryByLayerType(type: ECADLayerType): GeometryKind {
		switch (type) {
			case ECADLayerType.SIGNAL:
			case ECADLayerType.POWER_GROUND:
				return GeometryKind.LAYER_OTHERSIGNAL;
			case ECADLayerType.DIELECTRIC:
				return GeometryKind.LAYER_DIELECTRIC;
			case ECADLayerType.SOLDERMASK:
				return GeometryKind.LAYER_SOLDERMASK;
			case ECADLayerType.SILKSCREEN:
				return GeometryKind.LAYER_SILKSCREEN;
			case ECADLayerType.SOLDERPASTE:
				return GeometryKind.LAYER_SOLDERPASTE;
			case ECADLayerType.PASTEMASK:
				return GeometryKind.LAYER_PASTEMASK;
			case ECADLayerType.GLUE:
				return GeometryKind.LAYER_GLUE;
			case ECADLayerType.GLUEMASK:
				return GeometryKind.LAYER_GLUEMASK;
			case ECADLayerType.EMBEDDED_CAP_DIELECTRIC:
				return GeometryKind.LAYER_EMBEDDED_CAP_DIELECTRIC;
			case ECADLayerType.EMBEDDED_RESISTOR:
				return GeometryKind.LAYER_EMBEDDED_RESISTOR;
			case ECADLayerType.GENERIC:
				return GeometryKind.LAYER_GENERIC;
			case ECADLayerType.OTHER:
				return GeometryKind.LAYER_GENERIC;

			default:
				console.warn(
					`未识别的层类型: ${type}, 使用默认 LAYER_GENERIC 类型`
				);
				return GeometryKind.LAYER_GENERIC;
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
	private processLayerStackup(layerStackup: ECADLayerStackup): void {
		const layerMap = this.layerMap;
		const layerIdMap = this.layerIdMap;
		const layerStackBoundsMap = this.layerStackBoundsMap;
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
		const { useSimplified } = this.config;

		// # 创建层堆叠装配
		const boundsMap = new Map<string, EDMDZBounds>();
		layerStackBoundsMap.set(layerStackEcadId, boundsMap);
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

			boundsMap.set(layerId, layerBounds);
		});

		// ## 层堆叠属性
		const totalThickness = nextLowerBound;
		const userProperties: EDMDUserSimpleProperty[] = [];
		userProperties.push(this.craeteUserSimpleProperty(UserSimpleProperty.TotalThickness, totalThickness));

		const layerStackupAssembly: EDMDItemAssembly = {
			Description: `Layer stackup: ${layerIds.length} layers`,
			...this.getCommonData(layerStackup),
			id: layerStackupId,
			Name: layerStackName,
			ItemType: ItemType.ASSEMBLY,
			geometryType: GeometryKind.LAYER_STACKUP,
			ItemInstances: itemInstances,
			ReferenceName: layerStackName,
			UserProperties: userProperties,
		};

		// ## 传统方式建模
		if (!useSimplified) {
			delete layerStackupAssembly.geometryType;
		}

		this.itemsAssembly.push(layerStackupAssembly);
		this.layerStackMap.set(layerStackEcadId, layerStackup);
		this.layerStackThicknessMap.set(layerStackEcadId, totalThickness);
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
		const cartesianPoint: EDMDCartesianPoint = {
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
		const { useSimplified } = this.config;
		const { name: boardName, outline, thickness, stackupId, features, zones, bends } = board;
		this.boardLayerStackId = stackupId;
		const assemblyToName = this.getLayerStackName(stackupId);
		const boardThickness = this.getlayerStackThickness(
			stackupId || '',
			thickness && thickness > 0 ? thickness : 0
		);

		// # 处理板轮廓几何
		const boardShapeId = this.processGeometry(outline, true);

		// # 创建曲线集
		// ## 计算Z轴边界
		const boardZBounds: EDMDZBounds = {
			LowerBound: 0,
			UpperBound: 0,
		};
		if (!assemblyToName) {
			boardZBounds.UpperBound = boardThickness;
		}

		// ## 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			DetailedGeometricModelElements: [boardShapeId],
			...boardZBounds,
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

		// ## 处理板子特征: 切割区域
		iterateArr(features?.cutouts, cutout => {
			this.processBoardCutout(cutout, boardThickness);
		});

		// ## 处理板子特征: 铣削路径
		iterateArr(features?.milling, milling => {
			this.processMillingPath(milling, boardThickness);
		});

		// # 创建板子项目定义
		const boardSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const boardSingle: EDMDItemSingle = {
			id: boardSingleId,
			Name: 'PCB Board',
			Description: 'Main PCB board',
			Identifier: this.createIdentifier('BOARD'),
			...this.getCommonData(board),
			ItemType: ItemType.SINGLE,
			Shape: shapeElementId,
		};

		// ## 传统方式建模
		if (!useSimplified) {
			boardSingle.Shape = this.createBoardStratum(shapeElementId);
		}

		this.itemsSingle.push(boardSingle);

		// # 创建板子装配实例
		// ## 创建板子实例
		const boardInstanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
		const boardInstance: EDMDItemInstance = {
			id: boardInstanceId,
			Item: boardSingleId,
			InstanceName: this.createEDMDName(boardName || 'Board'),
			Transformation: this.createTransformation2D({
				position: Vector2.ORIGIN,
				rotation: 0,
			}),
		};

		const boardAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const boardAssembly: EDMDItemAssembly = {
			...this.getCommonData(board),
			id: boardAssemblyId,
			ItemType: ItemType.ASSEMBLY,
			geometryType: assemblyToName
				? GeometryKind.BOARD_AREA_RIGID
				: GeometryKind.BOARD_OUTLINE,
			ItemInstances: [boardInstance],
		};
		if (assemblyToName) {
			boardAssembly.AssembleToName = assemblyToName;
		}

		// ## 传统方式建模
		if (!useSimplified) {
			delete boardAssembly.geometryType;
		}

		this.itemsAssembly.push(boardAssembly);

		// # 处理层区域（刚柔结合板）
		zones && this.processLayerZones(zones);

		// # 处理弯曲区域（柔性板）
		bends && this.processBends(bends);
	}

	/**
	 * 处理板子切割区域
	 */
	private processBoardCutout(cutout: ECADClosedGeometry, boardThickness: number): void {
		// # 处理切割几何
		const cutoutShapeId = this.processGeometry(cutout, true);

		// # 创建曲线集（与板子相同Z范围）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: 0,
			UpperBound: boardThickness,
			DetailedGeometricModelElements: [cutoutShapeId],
		};
		this.curveSets.push(curveSet);

		// # 创建形状元素（切割，减去材料）
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: ShapeElementType.FeatureShapeElement,
			Inverted: true,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// # 创建切割项目（作为板子的子项）
		const cutoutSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const cutoutSingle: EDMDItemSingle = {
			id: cutoutSingleId,
			Name: 'BoardCutout',
			ItemType: ItemType.SINGLE,
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
	private processMillingPath(milling: ECADMillingPath, boardThickness: number): void {
		// # 处理路径几何
		const pathShapeId = this.processGeometry(milling.path);

		// # 创建曲线集（指定深度范围）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: 0,
			UpperBound: boardThickness,
			DetailedGeometricModelElements: [pathShapeId],
		};
		this.curveSets.push(curveSet);

		// # 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: milling.isPlated
				? ShapeElementType.PartMountingFeature
				: ShapeElementType.FeatureShapeElement,
			Inverted: true, // 减去材料
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// # 创建铣削项目
		const millingSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const millingSingle: EDMDItemSingle = {
			id: millingSingleId,
			Name: 'Milled Cutout',
			ItemType: ItemType.SINGLE,
			Shape: shapeElementId,
		};
		this.itemsSingle.push(millingSingle);

		// # 如果需要，可以创建铣削实例
	}

	/**
	 * 创建板子Stratum（传统方式）
	 */
	private createBoardStratum(shapeElementIds: string | string[]): string {
		const stratumId = this.generateId(IDXBuilderIDPre.Stratum);
		const stratum: EDMDStratum = {
			id: stratumId,
			ShapeElements: Array.isArray(shapeElementIds)
				? shapeElementIds
				: [shapeElementIds],
			StratumType: StratumType.DesignLayerStratum,
			StratumSurfaceDesignation: StratumSurfaceDesignation.PrimarySurface,
		};

		this.strata.push(stratum);
		return stratumId;
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

	// ------------ 构建3D模型 ------------
	/**
	 * 处理3D模型
	 */
	private processModel3D(model3D: ECADModel3D): string {
		const { identifier, format, version, location, transformation } = model3D;

		const modelId = this.generateId(IDXBuilderIDPre.Model);
		const idxModel: EDMDModel3D = {
			id: modelId,
			ModelIdentifier: identifier,
			MCADFormat: this.convertModelFormat(format),
		};
		if (version) {
			idxModel.ModelVersion = version;
		}
		if (location) {
			idxModel.ModelLocation = location;
		}
		if (transformation) {
			idxModel.Transformation = transformation;
		}

		this.model3DIdMap.set(identifier, modelId);
		return modelId;
	}

	/**
	 * ECAD到MCAD模型格式转换器
	 * @param ecadFormat ECAD格式
	 * @param targetMCAD 目标MCAD系统（可选）
	 * @returns MCAD支持的格式
	 */
	private convertModelFormat(ecadFormat: ECADModelFormat, targetMCAD?: MCADModelFormat): MCADModelFormat {
		switch (ecadFormat) {
			case ECADModelFormat.STEP:
				return MCADModelFormat.STEP;

			case ECADModelFormat.STL:
				return MCADModelFormat.STL;

			case ECADModelFormat.IGES:
				// IGES转STEP更可靠
				return MCADModelFormat.STEP;

			case ECADModelFormat.PARASOLID:
				// Parasolid是Siemens的格式
				if (
					targetMCAD ===
						MCADModelFormat.NX ||
					targetMCAD ===
						MCADModelFormat.SolidEdge
				) {
					return MCADModelFormat.NX; // NX支持Parasolid
				}
				return MCADModelFormat.STEP;

			case ECADModelFormat.SOLIDWORKS:
				if (targetMCAD === MCADModelFormat.SolidWorks) {
					return MCADModelFormat.SolidWorks;
				}
				return MCADModelFormat.STEP;

			case ECADModelFormat.NX:
				return MCADModelFormat.NX;

			case ECADModelFormat.CATIA:
				return MCADModelFormat.Catia;

			default:
				// 默认转为STEP（最通用的中性格式）
				return MCADModelFormat.STEP;
		}
	}

	// ------------ 构建封装 ------------
	/**
	 * 处理封装
	 *
	 * @remarks
	 * REF: Section 6.2
	 */
	private processFootprint(footprint: ECADFootprint): void {
		const { useSimplified } = this.config;
		const { packageName, geometry, pins, thermalProperties, valueProperties } = footprint;

		// # 处理封装轮廓几何
		const outlineShapeId = this.processGeometry(geometry.outline, true);

		// # 创建曲线集（封装高度通常为0，表示2D轮廓）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: 0,
			UpperBound: 0,
			DetailedGeometricModelElements: [outlineShapeId],
		};
		this.curveSets.push(curveSet);

		// # 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: ShapeElementType.FeatureShapeElement,
			Inverted: false,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// # 处理引脚
		const packagePins: EDMPackagePin[] = [];
		iterateArr(pins, pin => {
			const { pinNumber, primary, position, geometry } = pin;

			const packagePin: EDMPackagePin = {
				pinNumber,
				primary,
				Point: this.createPoint(position),
			};

			if (geometry) {
				const pinShapeId = this.processGeometry(geometry);
				packagePin.Shape = pinShapeId;
			}

			packagePins.push(packagePin);
		});

		// # 创建封装定义
		const footprintSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const footprintSingle: EDMDItemSingle = {
			Name: packageName,
			Description: `Footprint: ${packageName}`,
			Identifier: this.createIdentifier(`FOOTPRINT_${packageName}`),
			...this.getCommonData(footprint),
			id: footprintSingleId,
			ItemType: ItemType.SINGLE,
			PackageName: this.createEDMDName(packageName),
			Shape: shapeElementId,
			PackagePins: packagePins,
		};

		this.itemsSingle.push(footprintSingle);
		this.footprintSingleMap.set(packageName, footprintSingle);
	}

	// ------------ 构建元件 ------------
	/**
	 * 处理元件实例
	 *
	 * @remarks
	 * REF: Section 6.2.1
	 */
	private processComponent(component: ECADComponent): void {
		const { useSimplified } = this.config;
		const { transformation, isMechanical, layerId, zOffset, packageName, model3dId, footprintBounds } =
			component;
		const assembleToName = this.getLayerName(layerId);
		const footprintSingle = packageName ? this.footprintSingleMap.get(packageName) : undefined;
		const boundPackageName = footprintSingle?.PackageName;
		const boundModelId = model3dId ? this.model3DIdMap.get(model3dId) : undefined;

		let componentShape = footprintSingle?.Shape || '';

		// # 创建元件形状
		if (!componentShape) {
			if (!footprintBounds) {
				console.warn(
					'Invalid component: need packageName or footprintBounds'
				);
				return;
			}
			// ## 处理轮廓几何
			const outlineShapeId = this.processGeometry(footprintBounds.toRect());

			// ## 创建曲线集（封装高度通常为0，表示2D轮廓）
			const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
			const curveSet: EDMDCurveSet2D = {
				id: curveSetId,
				ShapeDescriptionType: 'GeometricModel',
				LowerBound: 0,
				UpperBound: 0,
				DetailedGeometricModelElements: [outlineShapeId],
			};
			this.curveSets.push(curveSet);

			// ## 创建形状元素
			const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
			const shapeElement: EDMDShapeElement = {
				id: shapeElementId,
				ShapeElementType: ShapeElementType.FeatureShapeElement,
				Inverted: false,
				DefiningShape: curveSetId,
			};
			this.shapeElements.push(shapeElement);

			// ## 传统方式建模
			if (!useSimplified) {
				// TODO: 待实现
			}

			componentShape = shapeElementId;
		}

		// # 创建元件定义
		const componentSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const componentSingle: EDMDItemSingle = {
			id: componentSingleId,
			ItemType: ItemType.SINGLE,
			Shape: componentShape,
		};
		if (boundPackageName) {
			componentSingle.PackageName = boundPackageName;
		}
		if (boundModelId) {
			componentSingle.EDMD3DModel = boundModelId;
		}

		// # 创建元件实例
		const componentInstanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
		const componentInstance: EDMDItemInstance = {
			id: componentInstanceId,
			Item: componentSingleId,
			Transformation: this.createTransformation2D(transformation),
		};
		if (zOffset) {
			componentInstance.zOffset = zOffset;
		}

		// # 创建元件装配
		const componentAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const geometryType = isMechanical ? GeometryKind.COMPONENT_MECHANICAL : GeometryKind.COMPONENT;
		const componentAssembly: EDMDItemAssembly = {
			...this.getCommonData(component),
			id: componentAssemblyId,
			ItemType: ItemType.ASSEMBLY,
			geometryType,
			ItemInstances: [componentInstance],
		};
		if (assembleToName) {
			componentAssembly.AssembleToName = assembleToName;
		}

		// # 传统方式建模
		if (!useSimplified) {
			delete componentAssembly.geometryType;
		}

		this.itemsAssembly.push(componentAssembly);
	}

	// ------------ 构建孔 ------------
	/**
	 * 处理孔和过孔
	 *
	 * @remarks
	 * REF: Section 6.3
	 */
	private processHole(hole: ECADHole): void {
		const { useSimplified } = this.config;
		const { geometry, type, layerSpan, stackupId, zRange, isMilled, millDiameter, padstackName } = hole;

		// # 处理过孔几何
		const holeShapeId = this.processGeometry(geometry);

		// # 创建曲线集
		// ## TODO: 计算孔Z轴边界
		let lowerBound: number | undefined = 0;
		let upperBound: number | undefined = 0;
		if (zRange) {
			lowerBound = zRange.lowerBound;
			upperBound = zRange.upperBound;
		} else if (stackupId) {
			upperBound = 1.6; // TODO
		}

		// ## 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: lowerBound || 0,
			UpperBound: upperBound || 0,
			DetailedGeometricModelElements: [holeShapeId],
		};
		this.curveSets.push(curveSet);

		// # 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: isMilled
				? ShapeElementType.PartMountingFeature
				: ShapeElementType.FeatureShapeElement,
			Inverted: type === ECADHoleType.NPTH ? false : true,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// # 创建孔项目定义
		const holeSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const holeSingle: EDMDItemSingle = {
			id: holeSingleId,
			ItemType: ItemType.SINGLE,
			Shape: shapeElementId,
		};
		// TODO: 焊盘堆栈待支持
		// if (padstackName) {
		// 	holeSingle.PackageName = this.createEDMDName(padstackName);
		// }

		this.itemsSingle.push(holeSingle);

		// # 创建孔装配
		// TODO: 应该使用堆栈和来优化过孔
		// ## 创建孔实例
		const instanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
		const itemInstance: EDMDItemInstance = {
			id: instanceId,
			Item: holeSingleId,
		};

		// ## 孔类型
		const geometryType = this.convertHoleType(type);
		const assembleToName = ''; // TODO: 根据创建堆栈来实现
		const holeAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const holeAssembly: EDMDItemAssembly = {
			...this.getCommonData(hole),
			id: holeAssemblyId,
			ItemType: ItemType.ASSEMBLY,
			geometryType,
			ItemInstances: [itemInstance],
		};
		// ## 传统方式建模
		if (!useSimplified) {
			delete holeAssembly.geometryType;
			// TODO
		}

		this.itemsAssembly.push(holeAssembly);
	}

	/**
	 * 将ECAD孔类型转换为IDX几何类型
	 * @param viaType ECAD孔类型
	 * @returns 对应的IDX几何类型
	 */
	private convertHoleType(viaType: ECADHoleType): GeometryKind {
		switch (viaType) {
			case ECADHoleType.PTH:
				return GeometryKind.HOLE_PLATED;
			case ECADHoleType.NPTH:
				return GeometryKind.HOLE_NON_PLATED;
			case ECADHoleType.VIA:
				return GeometryKind.VIA;
			case ECADHoleType.FILLED_VIA:
				return GeometryKind.FILLED_VIA;
			case ECADHoleType.BLIND:
			case ECADHoleType.BURIED:
				// 盲孔和埋孔在IDX中通常用VIA表示，通过z范围区分
				return GeometryKind.VIA;
			default:
				// 默认返回电镀孔
				return GeometryKind.HOLE_PLATED;
		}
	}

	// ------------ 构建禁止区 ------------
	/**
	 * 处理禁布区/保持区
	 *
	 * @remarks
	 * REF: Section 6.5
	 */
	private processConstraint(constraint: ECADConstraintArea): void {
		const { type, purpose, geometry, layerId, zRange } = constraint;

		// # 处理约束几何
		const constraintShapeId = this.processGeometry(geometry);

		// # 创建曲线集
		// ## 确定Z范围
		// TODO
		let lowerBound = constraint.zRange?.lowerBound;
		let upperBound = constraint.zRange?.upperBound;

		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: 'GeometricModel',
			LowerBound: lowerBound || 0,
			UpperBound: upperBound || 0,
			DetailedGeometricModelElements: [constraintShapeId],
		};
		this.curveSets.push(curveSet);

		// # 创建形状元素
		const shapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
		const shapeElement: EDMDShapeElement = {
			id: shapeElementId,
			ShapeElementType: ShapeElementType.FeatureShapeElement,
			Inverted: false,
			DefiningShape: curveSetId,
		};
		this.shapeElements.push(shapeElement);

		// # 创建约束项目定义
		const constraintSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const constraintSingle: EDMDItemSingle = {
			id: constraintSingleId,
			ItemType: ItemType.SINGLE,
			Shape: shapeElementId,
		};
		this.itemsSingle.push(constraintSingle);

		// # 创建约束实例
		const instanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
		const itemInstance: EDMDItemInstance = {
			id: instanceId,
			Item: constraintSingleId,
		};

		// # 创建约束装配
		const geometryType = this.convertConstraintType(constraint.type, constraint.purpose);
		const constraintAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const constraintAssembly: EDMDItemAssembly = {
			...this.getCommonData(constraint),
			id: constraintAssemblyId,
			geometryType,
			ItemInstance: [itemInstance],
		};

		this.itemsAssembly.push(constraintAssembly);
	}

	/**
	 * 获取约束类型的geometryType
	 */
	private convertConstraintType(type: 'KEEPOUT' | 'KEEPIN', purpose: ECADConstraintPurpose): string {
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

	// ------------ 构建非协作数据 ------------
	/**
	 * 处理非协作数据
	 */
	private processNonCollaborativeData(data: ECADNonCollaborativeData): void {
		const { traces, copperAreas, silkscreens } = data;

		// # 处理走线
		iterateArr(traces, trace => {
			this.processTrace(trace);
		});

		// # 处理铜皮区域
		iterateArr(copperAreas, area => {
			this.processCopperArea(area);
		});

		// # 处理丝印
		iterateArr(silkscreens, silkscreen => {
			this.processSilkscreen(silkscreen);
		});
	}

	/**
	 * 处理走线
	 */
	private processTrace(trace: ECADTrace): void {
		// TODO
	}

	/**
	 * 处理铜皮区域
	 */
	private processCopperArea(area: ECADCopperArea): void {
		// TODO
	}

	/**
	 * 处理丝印
	 */
	private processSilkscreen(silkscreen: ECADSilkscreen): void {
		// TODO
	}

	// ============= 构建 ProcessInstruction =============
	/**
	 * 构建处理指令
	 */
	private buildProcessInstruction(metadata: ECADMeta): EDMDProcessInstruction {
		const { designName, revision, creator, timestamps, globalUnit, description, projectId } = metadata;
		const { name: creatorName } = creator;

		const instruction: EDMDProcessInstructionSendInformation = {
			type: IDXComputationalTag.SendInformation,
			Actor: creatorName,
			Description: designName,
		};

		return instruction;
	}
}
