import { Arc } from '../../libs/geometry/Arc';
import { Circle } from '../../libs/geometry/Circle';
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
	EDMDLengthProperty,
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
	CurveSet2DShapeDescType,
	EDMDBSplineCurve,
	EDMDCircle3Point,
	EDMDEllipse,
} from '../../types/edmd/geometry.types';
import { EDMDItemSingle, EDMDItemAssembly, ItemType, EDMDItemInstance, EDMPackagePin, EDMDGeometryType } from '../../types/edmd/item.types';
import { LayerDefinition, LayerStackupDefinition, LayerStackupLayer, EDMDLayerType } from '../../types/edmd/layer.types';
import { EDMDModel3D } from '../../types/edmd/model3d.types';
import { IDXD2Tag, IDXComputationalTag, IDXPDMTag } from '../../types/edmd/namespace.types';
import {
	EDMDShapeElement,
	EDMDStratum,
	LayerPurpose,
	ShapeElementType,
	StratumType,
	StratumSurfaceDesignation,
	EDMDInterStratumFeature,
	InterStratumFeatureType,
	EDMDKeepOut,
	EDMDKeepIn,
	KeepConstraintPurpose,
	EDMDAssemblyComponent,
	AssemblyComponentType,
	EDMDFunctionalItemShape,
	FunctionalItemShapeType,
	EDMDStratumTechnology,
	TechnologyType,
	EDMDThirdItem,
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
	/** 传统方式Third Item对象集合 */
	private thirdItems: EDMDThirdItem[] = [];

	/** 项目定义集合 */
	private itemsSingle: EDMDItemSingle[] = [];
	/** 项目装配集合 */
	private itemsAssembly: EDMDItemAssembly[] = [];

	/** 层定义集合 */
	private layerDefinitions: LayerDefinition[] = [];
	/** 层堆叠定义集合 */
	private layerStackupDefinitions: LayerStackupDefinition[] = [];

	/** 3D模型集合 */
	private models3D: EDMDModel3D[] = [];

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

		// # 处理处理指令
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
		this.thirdItems = [];

		this.itemsSingle = [];
		this.itemsAssembly = [];

		this.layerDefinitions = [];
		this.layerStackupDefinitions = [];

		this.models3D = [];

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
			Version: '1',
			Revision: '0',
			Sequence: '0',
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
	private createUserSimpleProperty(key: string, value: string | number | boolean, ext?: Partial<EDMDUserSimpleProperty>) {
		const userProp: EDMDUserSimpleProperty = {
			Key: this.createEDMDName(key),
			Value: value,
			...ext,
		};
		return userProp;
	}

	/** 创建长度属性 */
	private createLengthProperty(value: number): EDMDLengthProperty {
		// return { Value: value };
		return value;
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
		if (!layerBounds) {
			return undefined;
		}

		const referenceUpperBound = referenceLayer.UpperBound;
		return {
			LowerBound: layerBounds.LowerBound - referenceUpperBound,
			UpperBound: layerBounds.UpperBound - referenceUpperBound,
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
			tx: this.createLengthProperty(x),
			ty: this.createLengthProperty(y),
		};
	}

	/**
	 * 组装数据体
	 */
	private assembleBody(): EDMDDataSetBody {
		const body: EDMDDataSetBody = {};

		// 收集点
		const points: EDMDCartesianPoint[] = [];
		this.pointMap.forEach(point => {
			points.push(point);
		});
		if (points.length > 0) body.Points = points;

		// 收集几何
		const geometries: EDMDGeometry[] = [];
		this.geometryMap.forEach(geometry => {
			geometries.push(geometry);
		});
		if (geometries.length > 0) body.Geometries = geometries;

		// 收集曲线集
		if (this.curveSets.length > 0) body.CurveSets = this.curveSets;

		// 收集形状元素
		if (this.shapeElements.length > 0) body.ShapeElements = this.shapeElements;

		// 收集传统方式Third Items
		if (this.thirdItems.length > 0) {
			body.ThirdItems = this.thirdItems;
		}

		// 收集层定义
		if (this.layerDefinitions.length > 0) {
			body.Layers = this.layerDefinitions;
		}

		// 收集层堆叠定义
		if (this.layerStackupDefinitions.length > 0) {
			body.LayerStackups = this.layerStackupDefinitions;
		}

		// 收集3D模型
		if (this.models3D.length > 0) {
			body.Models3D = this.models3D;
		}

		// 收集项目定义
		if (this.itemsSingle.length > 0) body.ItemsSingle = this.itemsSingle;

		// 收集项目装配
		if (this.itemsAssembly.length > 0) body.ItemsAssembly = this.itemsAssembly;

		// 收集历史记录
		if (this.histories.length > 0) body.Histories = this.histories;

		return body;
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
	 * 根据IDXv4.5建模指南，创建LayerDefinition和LayerStackupDefinition
	 * 并添加到EDMDDataSetBody的Layers和LayerStackups字段中
	 * REF: Section 6.1.2.1, 6.1.2.2
	 */
	private processLayersAndStackups(layers: Record<string, ECADLayer>, stackups: Record<string, ECADLayerStackup>): void {
		const { useSimplified } = this.config;

		if (useSimplified) {
			// # 简化建模方式
			iterateObject(layers, layer => {
				this.processLayerDefinition(layer);
			});

			iterateObject(stackups, layerStack => {
				this.processLayerStackupDefinition(layerStack);
			});
		} else {
			// # 传统建模方式
			this.processLayersTraditional(layers, stackups);
		}
	}

	/**
	 * 验证并准备层数据
	 *
	 * @remarks
	 * 提取公共的层验证逻辑，避免重复代码
	 */
	private validateAndPrepareLayers(layerStackup: ECADLayerStackup): Array<{ ecadId: string; layer: ECADLayer }> | null {
		const { id: layerStackEcadId, layerIds } = layerStackup;

		// # 验证层数据
		if (!layerIds || layerIds.length === 0) {
			console.warn(`Layer stackup ${layerStackEcadId} has no layers`);
			return null;
		}

		const validLayers: Array<{ ecadId: string; layer: ECADLayer }> = [];
		let hasInvalidLayer = false;

		layerIds.forEach(layerId => {
			const layer = this.layerMap.get(layerId);
			if (!layer) {
				console.warn(
					`Invalid layer reference in stackup: ${layerId}`
				);
				hasInvalidLayer = true;
				return;
			}
			validLayers.push({ ecadId: layerId, layer });
		});

		if (hasInvalidLayer || validLayers.length === 0) {
			console.warn(`Skipping invalid layer stackup: ${layerStackEcadId}`);
			return null;
		}

		return validLayers;
	}

	/**
	 * 计算层的Z轴边界
	 *
	 * @remarks
	 * 提取公共的Z轴计算逻辑，避免重复代码
	 */
	private calculateLayerBounds(validLayers: Array<{ ecadId: string; layer: ECADLayer }>): {
		boundsMap: Map<string, EDMDZBounds>;
		totalThickness: number;
	} {
		let currentZ = 0;
		const boundsMap = new Map<string, EDMDZBounds>();

		validLayers.forEach(({ ecadId, layer }) => {
			const { thickness } = layer;

			// 计算当前层的Z轴边界
			const lowerBound = currentZ;
			const upperBound = currentZ + thickness;

			const layerBounds: EDMDZBounds = {
				LowerBound: this.createLengthProperty(lowerBound),
				UpperBound: this.createLengthProperty(upperBound),
			};

			// 保存层边界信息供其他对象使用
			boundsMap.set(ecadId, layerBounds);

			// 更新Z位置到下一层
			currentZ += thickness;
		});

		return {
			boundsMap,
			totalThickness: currentZ,
		};
	}

	/**
	 * 保存层堆叠信息到映射表
	 *
	 * @remarks
	 * 提取公共的映射表更新逻辑，避免重复代码
	 */
	private saveLayerStackupInfo(
		layerStackEcadId: string,
		layerStackup: ECADLayerStackup,
		boundsMap: Map<string, EDMDZBounds>,
		totalThickness: number
	): void {
		this.layerStackBoundsMap.set(layerStackEcadId, boundsMap);
		this.layerStackMap.set(layerStackEcadId, layerStackup);
		this.layerStackThicknessMap.set(layerStackEcadId, totalThickness);
	}

	/**
	 * 处理单个物理层定义 (LayerDefinition)
	 *
	 * @remarks
	 * 根据IDXv4.5建模指南，创建LayerDefinition对象
	 * 添加到EDMDDataSetBody的Layers字段中
	 */
	private processLayerDefinition(layer: ECADLayer): void {
		const {
			id: layerId,
			name: layerName,
			type: layerType,
			thickness: layerThickness,
			material: layerMaterial,
		} = layer;

		// # 创建层定义对象 - 移除边界属性，这些将在层堆叠中定义
		const layerDefinition: LayerDefinition = {
			id: layerId,
			layerType: this.getLayerTechnologyTypeByLayerType(layerType),
			name: layerName,
			description: `Layer definition: ${layerName}`,
			referenceName: layerName, // 用于层堆叠中的引用
			lowerBound: 0, // 占位符，实际值在层堆叠中设置
			upperBound: 0, // 占位符，实际值在层堆叠中设置
			thickness: layerThickness,
			identifier: this.createIdentifier(`${layerId}_LAYER`),
		};
		if (layerMaterial) {
			layerDefinition.material = layerMaterial;
		}

		this.layerDefinitions.push(layerDefinition);
		this.layerMap.set(layerId, layer);
		this.layerIdMap.set(layerId, layerId); // 使用原始ID作为引用
	}

	/**
	 * 根据层类型获取LayerType用户属性值
	 *
	 * @param type ECAD层类型
	 * @returns 对应的LayerType枚举值
	 *
	 * @remarks
	 * 根据PSI5 IDXv4.5指南第51-52页，LayerType值应使用标准枚举值
	 */
	private getLayerTypeForUserProperty(type: ECADLayerType): string {
		switch (type) {
			case ECADLayerType.SIGNAL:
				return EDMDLayerType.SIGNAL;
			case ECADLayerType.POWER_GROUND:
				return EDMDLayerType.POWERGROUND;
			case ECADLayerType.DIELECTRIC:
				return EDMDLayerType.DIELECTRIC;
			case ECADLayerType.SOLDERMASK:
				return EDMDLayerType.SOLDERMASK;
			case ECADLayerType.SILKSCREEN:
				return EDMDLayerType.SILKSCREEN;
			case ECADLayerType.SOLDERPASTE:
				return EDMDLayerType.SOLDERPASTE;
			case ECADLayerType.PASTEMASK:
				return EDMDLayerType.PASTEMASK;
			case ECADLayerType.GLUE:
				return EDMDLayerType.GLUE;
			case ECADLayerType.GLUEMASK:
				return EDMDLayerType.GLUEMASK;
			case ECADLayerType.EMBEDDED_CAP_DIELECTRIC:
				return EDMDLayerType.EMBEDDED_CAPACITOR_DIELECTRIC;
			case ECADLayerType.EMBEDDED_RESISTOR:
				return EDMDLayerType.EMBEDDED_RESISTOR;
			case ECADLayerType.GENERIC:
			case ECADLayerType.OTHER:
			default:
				return EDMDLayerType.GENERICLAYER;
		}
	}

	/**
	 * 根据层类型获取层技术类型
	 *
	 * @param type ECAD层类型
	 * @returns 对应的EDMDGeometryType
	 */
	private getLayerTechnologyTypeByLayerType(type: ECADLayerType): EDMDGeometryType {
		switch (type) {
			case ECADLayerType.SIGNAL:
				return EDMDGeometryType.LAYER_OTHERSIGNAL; // 信号层使用LAYER_OTHERSIGNAL
			case ECADLayerType.POWER_GROUND:
				return EDMDGeometryType.LAYER_OTHERSIGNAL;
			case ECADLayerType.DIELECTRIC:
				return EDMDGeometryType.LAYER_DIELECTRIC;
			case ECADLayerType.SOLDERMASK:
				return EDMDGeometryType.LAYER_SOLDERMASK;
			case ECADLayerType.SILKSCREEN:
				return EDMDGeometryType.LAYER_SILKSCREEN;
			case ECADLayerType.SOLDERPASTE:
				return EDMDGeometryType.LAYER_SOLDERPASTE;
			case ECADLayerType.GLUE:
				return EDMDGeometryType.LAYER_GLUE;
			case ECADLayerType.PASTEMASK:
			case ECADLayerType.GLUEMASK:
			case ECADLayerType.EMBEDDED_CAP_DIELECTRIC:
			case ECADLayerType.EMBEDDED_RESISTOR:
			case ECADLayerType.GENERIC:
			case ECADLayerType.OTHER:
			default:
				console.warn(
					`未识别的层类型: ${type}, 使用默认 LAYER_OTHERSIGNAL 类型`
				);
				return EDMDGeometryType.LAYER_OTHERSIGNAL;
		}
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
	private getLayerGeometryByLayerType(type: ECADLayerType): EDMDGeometryType {
		switch (type) {
			case ECADLayerType.SIGNAL:
				return EDMDGeometryType.LAYER_OTHERSIGNAL; // 信号层使用LAYER_OTHERSIGNAL
			case ECADLayerType.POWER_GROUND:
				return EDMDGeometryType.LAYER_OTHERSIGNAL;
			case ECADLayerType.DIELECTRIC:
				return EDMDGeometryType.LAYER_DIELECTRIC;
			case ECADLayerType.SOLDERMASK:
				return EDMDGeometryType.LAYER_SOLDERMASK;
			case ECADLayerType.SILKSCREEN:
				return EDMDGeometryType.LAYER_SILKSCREEN;
			case ECADLayerType.SOLDERPASTE:
				return EDMDGeometryType.LAYER_SOLDERPASTE;
			case ECADLayerType.PASTEMASK:
				return EDMDGeometryType.LAYER_PASTEMASK;
			case ECADLayerType.GLUE:
				return EDMDGeometryType.LAYER_GLUE;
			case ECADLayerType.GLUEMASK:
				return EDMDGeometryType.LAYER_GLUEMASK;
			case ECADLayerType.EMBEDDED_CAP_DIELECTRIC:
				return EDMDGeometryType.LAYER_EMBEDDED_CAP_DIELECTRIC;
			case ECADLayerType.EMBEDDED_RESISTOR:
				return EDMDGeometryType.LAYER_EMBEDDED_RESISTOR;
			case ECADLayerType.GENERIC:
				return EDMDGeometryType.LAYER_GENERIC;
			case ECADLayerType.OTHER:
				return EDMDGeometryType.LAYER_GENERIC;

			default:
				console.warn(
					`未识别的层类型: ${type}, 使用默认 LAYER_GENERIC 类型`
				);
				return EDMDGeometryType.LAYER_GENERIC;
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
				return LayerPurpose.OtherSignal;
			case ECADLayerType.POWER_GROUND:
				return LayerPurpose.PowerOrGround;
			case ECADLayerType.DIELECTRIC:
				return LayerPurpose.EmbeddedPassiveCapacitorDielectric;
			case ECADLayerType.SOLDERMASK:
				return LayerPurpose.SolderMask;
			case ECADLayerType.SILKSCREEN:
				return LayerPurpose.SilkScreen;
			case ECADLayerType.SOLDERPASTE:
				return LayerPurpose.SolderPaste;
			case ECADLayerType.PASTEMASK:
				return LayerPurpose.SolderPaste;
			case ECADLayerType.GLUE:
				return LayerPurpose.Glue;
			case ECADLayerType.GLUEMASK:
				return LayerPurpose.Glue;
			case ECADLayerType.EMBEDDED_CAP_DIELECTRIC:
				return LayerPurpose.EmbeddedPassiveCapacitorDielectric;
			case ECADLayerType.EMBEDDED_RESISTOR:
				return LayerPurpose.EmbeddedPassiveResistor;
			case ECADLayerType.GENERIC:
				return LayerPurpose.GenericLayer;
			case ECADLayerType.OTHER:
				return LayerPurpose.GenericLayer;
			default:
				console.warn(
					`未识别的层类型: ${type}, 使用默认 GENERIC 类型`
				);
				return LayerPurpose.GenericLayer;
		}
	}

	/**
	 * 处理层堆叠定义 (LayerStackupDefinition)
	 *
	 * @remarks
	 * 根据IDXv4.5建模指南，创建LayerStackupDefinition对象
	 * 添加到EDMDDataSetBody的LayerStackups字段中
	 */
	private processLayerStackupDefinition(layerStackup: ECADLayerStackup): void {
		const { id: layerStackEcadId, name: layerStackName } = layerStackup;

		// # 验证层数据
		const validLayers = this.validateAndPrepareLayers(layerStackup);
		if (!validLayers) {
			return;
		}

		// # 计算层的Z轴位置
		const { boundsMap, totalThickness } = this.calculateLayerBounds(validLayers);
		const stackupLayers: LayerStackupLayer[] = [];

		validLayers.forEach(({ ecadId, layer }) => {
			const { name: layerName, type: layerType } = layer;
			const layerBounds = boundsMap.get(ecadId)!;

			// 创建层堆叠中的层定义
			const stackupLayer: LayerStackupLayer = {
				layerId: this.layerIdMap.get(ecadId) || ecadId,
				layerReferenceName: layerName,
				layerType: this.getLayerTypeForUserProperty(
					layerType
				), // 使用正确的LayerType枚举值
				lowerBound: layerBounds.LowerBound as number,
				upperBound: layerBounds.UpperBound as number,
				...(layer.material && { material: layer.material }),
			};
			stackupLayers.push(stackupLayer);
		});

		// # 创建层堆叠定义对象
		const layerStackupDefinition: LayerStackupDefinition = {
			id: layerStackEcadId,
			name: layerStackName,
			description: `Layer stackup definition: ${validLayers.length} layers, ${totalThickness.toFixed(3)}mm total thickness`,
			referenceName: layerStackName,
			layers: stackupLayers,
			totalThickness: totalThickness,
			identifier: this.createIdentifier(`${layerStackEcadId}_STACKUP`),
		};

		this.layerStackupDefinitions.push(layerStackupDefinition);

		// # 保存层堆叠信息
		this.saveLayerStackupInfo(layerStackEcadId, layerStackup, boundsMap, totalThickness);
	}

	/**
	 * 处理层和层堆叠（传统建模方式）
	 *
	 * @remarks
	 * 传统建模方式使用完整的层次结构：
	 * Item (assembly) → Item (single) → Third Item (EDMDStratum) → ShapeElement → CurveSet2d
	 * REF: Section 6.1.2 (Traditional approach)
	 */
	private processLayersTraditional(layers: Record<string, ECADLayer>, stackups: Record<string, ECADLayerStackup>): void {
		// # 处理层技术定义
		iterateObject(layers, layer => {
			this.processLayerTechnologyTraditional(layer);
		});

		// # 处理层堆叠（传统方式）
		iterateObject(stackups, layerStack => {
			this.processLayerStackupTraditional(layerStack);
		});
	}

	/**
	 * 处理单个层技术定义（传统方式）
	 *
	 * @remarks
	 * 创建StratumTechnology对象，定义层的技术属性
	 */
	private processLayerTechnologyTraditional(layer: ECADLayer): void {
		const { id: layerId, name: layerName, type: layerType } = layer;

		// # 创建层技术对象
		const stratumTechnologyId = this.generateId(IDXBuilderIDPre.StratumTechnology);
		const stratumTechnology: EDMDStratumTechnology = {
			id: stratumTechnologyId,
			type: IDXPDMTag.EDMDStratumTechnology,
			TechnologyType: TechnologyType.Design,
			LayerPurpose: this.getLayerPurposeByLayerType(layerType),
		};

		this.thirdItems.push(stratumTechnology);
		this.layerMap.set(layerId, layer);
		this.layerIdMap.set(layerId, stratumTechnologyId); // 传统方式使用StratumTechnology ID
	}

	/**
	 * 处理层堆叠（传统方式）
	 *
	 * @remarks
	 * 传统方式需要创建完整的层次结构：
	 * 1. 为每个层创建ShapeElement和CurveSet2D（定义Z轴范围）
	 * 2. 创建Stratum对象引用ShapeElement和StratumTechnology
	 * 3. 创建Layer Item (single)引用Stratum
	 * 4. 创建Layer Stackup Item (assembly)包含所有层实例
	 */
	private processLayerStackupTraditional(layerStackup: ECADLayerStackup): void {
		const { id: layerStackEcadId, name: layerStackName } = layerStackup;

		// # 验证层数据
		const validLayers = this.validateAndPrepareLayers(layerStackup);
		if (!validLayers) {
			return;
		}

		// # 计算层的Z轴位置并创建完整的传统层次结构
		const { boundsMap, totalThickness } = this.calculateLayerBounds(validLayers);
		const layerItemIds: string[] = [];

		validLayers.forEach(({ ecadId, layer }) => {
			const { name: layerName } = layer;
			const layerBounds = boundsMap.get(ecadId)!;

			// ## 1. 创建层的CurveSet2D（定义Z轴范围）
			const layerCurveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
			const layerCurveSet: EDMDCurveSet2D = {
				id: layerCurveSetId,
				ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
				LowerBound: layerBounds.LowerBound,
				UpperBound: layerBounds.UpperBound,
				DetailedGeometricModelElements: [], // 层本身没有具体几何，由其上的对象定义
			};
			this.curveSets.push(layerCurveSet);

			// ## 2. 创建层的ShapeElement
			const layerShapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
			const layerShapeElement: EDMDShapeElement = {
				id: layerShapeElementId,
				ShapeElementType: ShapeElementType.DesignLayerStratum,
				Inverted: false,
				DefiningShape: layerCurveSetId,
			};
			this.shapeElements.push(layerShapeElement);

			// ## 3. 创建Stratum对象（传统方式）
			const stratumId = this.generateId(IDXBuilderIDPre.Stratum);
			const stratumTechnologyId = this.layerIdMap.get(ecadId);
			const stratum: EDMDStratum = {
				id: stratumId,
				type: IDXPDMTag.EDMDStratum,
				ShapeElements: [layerShapeElementId], // 引用ShapeElement
				StratumType: StratumType.DesignLayerStratum,
				StratumSurfaceDesignation: StratumSurfaceDesignation.PrimarySurface,
				...(stratumTechnologyId && {
					StratumTechnology: stratumTechnologyId,
				}), // 引用StratumTechnology
			};
			this.thirdItems.push(stratum);

			// ## 4. 创建Layer Item (single)
			const layerSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
			const layerSingle: EDMDItemSingle = {
				id: layerSingleId,
				Name: layerName,
				Description: `Layer definition: ${layerName}`,
				Identifier: this.createIdentifier(`${ecadId}_LAYER`),
				ItemType: ItemType.SINGLE,
				Shape: stratumId, // 引用Stratum（Third Item）
				ReferenceName: layerName,
			};
			this.itemsSingle.push(layerSingle);
			layerItemIds.push(layerSingleId);
		});

		// ## 5. 创建Layer Stackup Item (assembly)
		const layerStackupAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const layerStackupInstances: EDMDItemInstance[] = [];

		// 为每个层创建实例
		validLayers.forEach(({ ecadId, layer }, index) => {
			const layerSingleId = layerItemIds[index];
			if (!layerSingleId) {
				console.warn(
					`Missing layer single ID for layer ${ecadId}`
				);
				return;
			}

			const instanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
			const instance: EDMDItemInstance = {
				id: instanceId,
				Item: layerSingleId,
				InstanceName: this.createEDMDName(
					`${layer.name}_Instance`
				),
			};
			layerStackupInstances.push(instance);
		});

		const layerStackupAssembly: EDMDItemAssembly = {
			id: layerStackupAssemblyId,
			Name: layerStackName,
			Description: `Layer stackup definition: ${validLayers.length} layers, ${totalThickness.toFixed(3)}mm total thickness`,
			Identifier: this.createIdentifier(`${layerStackEcadId}_STACKUP`),
			ItemType: ItemType.ASSEMBLY,
			ReferenceName: layerStackName,
			ItemInstances: layerStackupInstances,
		};
		this.itemsAssembly.push(layerStackupAssembly);

		// # 保存层堆叠信息
		this.saveLayerStackupInfo(layerStackEcadId, layerStackup, boundsMap, totalThickness);
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
			Diameter: this.createLengthProperty(circle.radius * 2),
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
		const assembleToName = this.getLayerStackName(stackupId);
		const boardThickness = this.getlayerStackThickness(
			stackupId || '',
			thickness && thickness > 0 ? thickness : 0
		);

		// # 处理板轮廓几何
		const boardShapeId = this.processGeometry(outline, true);

		// # 创建曲线集
		// ## 计算Z轴边界
		const boardZBounds: EDMDZBounds = {
			LowerBound: this.createLengthProperty(0),
			UpperBound: this.createLengthProperty(boardThickness),
		};

		// ## 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
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
			geometryType: assembleToName
				? EDMDGeometryType.BOARD_AREA_RIGID
				: EDMDGeometryType.BOARD_OUTLINE,
			ItemInstances: [boardInstance],
		};
		if (assembleToName) {
			boardAssembly.AssembleToName = assembleToName;
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
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: this.createLengthProperty(0),
			UpperBound: this.createLengthProperty(boardThickness),
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
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: this.createLengthProperty(0),
			UpperBound: this.createLengthProperty(boardThickness),
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
			type: IDXPDMTag.EDMDStratum,
			id: stratumId,
			ShapeElements: Array.isArray(shapeElementIds)
				? shapeElementIds
				: [shapeElementIds],
			StratumType: StratumType.DesignLayerStratum,
			StratumSurfaceDesignation: StratumSurfaceDesignation.PrimarySurface,
		};

		this.thirdItems.push(stratum);
		return stratumId;
	}

	/**
	 * 处理层区域
	 *
	 * @remarks
	 * REF: Section 6.1.2.3
	 */
	private processLayerZones(zones: ECADLayerZone[]): void {
		const { useSimplified } = this.config;

		zones.forEach(zone => {
			const { id, name, geometry, stackupId, zoneType } = zone;
			const assembleToName = this.getLayerStackName(stackupId);

			// # 处理区域几何
			const zoneShapeId = this.processGeometry(geometry, true);

			// # 创建曲线集（使用0厚度，因为厚度由层堆叠定义）
			const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
			const curveSet: EDMDCurveSet2D = {
				id: curveSetId,
				ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
				LowerBound: this.createLengthProperty(0),
				UpperBound: this.createLengthProperty(0),
				DetailedGeometricModelElements: [zoneShapeId],
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

			// # 创建区域项目定义
			const zoneSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
			const zoneSingle: EDMDItemSingle = {
				id: zoneSingleId,
				Name: name,
				ItemType: ItemType.SINGLE,
				Shape: shapeElementId,
			};
			if (assembleToName) {
				zoneSingle.AssembleToName = assembleToName;
			}

			// # 传统方式建模
			if (!useSimplified) {
				// 创建FunctionalItemShape作为Third Item
				const functionalItemId = this.generateId(
					IDXBuilderIDPre.ThirdItem
				);
				let functionalItemShapeType: FunctionalItemShapeType;
				switch (zoneType) {
					case 'FLEXIBLE':
						functionalItemShapeType =
							FunctionalItemShapeType.FlexibleArea;
						break;
					case 'STIFFENER':
						functionalItemShapeType =
							FunctionalItemShapeType.Stiffener;
						break;
					case 'RIGID':
					default:
						functionalItemShapeType =
							FunctionalItemShapeType.MechanicalItem;
						break;
				}

				const functionalItem: EDMDFunctionalItemShape = {
					id: functionalItemId,
					type: IDXPDMTag.EDMDFunctionalItemShape,
					ShapeElement: shapeElementId,
					FunctionalItemShapeType: functionalItemShapeType,
				};

				this.thirdItems.push(functionalItem);
				zoneSingle.Shape = functionalItemId;
			}

			this.itemsSingle.push(zoneSingle);

			// # 创建区域装配
			const zoneAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
			let geometryType: EDMDGeometryType;
			switch (zoneType) {
				case 'FLEXIBLE':
					geometryType =
						EDMDGeometryType.BOARD_AREA_FLEXIBLE;
					break;
				case 'STIFFENER':
					geometryType =
						EDMDGeometryType.BOARD_AREA_STIFFENER;
					break;
				case 'RIGID':
				default:
					geometryType =
						EDMDGeometryType.BOARD_AREA_RIGID;
					break;
			}

			const zoneInstanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
			const zoneInstance: EDMDItemInstance = {
				id: zoneInstanceId,
				Item: zoneSingleId,
				InstanceName: this.createEDMDName(name),
			};

			const zoneAssembly: EDMDItemAssembly = {
				id: zoneAssemblyId,
				Name: name,
				ItemType: ItemType.ASSEMBLY,
				geometryType: geometryType,
				ItemInstances: [zoneInstance],
			};

			if (!useSimplified) {
				delete zoneAssembly.geometryType;
			}

			this.itemsAssembly.push(zoneAssembly);
		});
	}

	/**
	 * 处理弯曲区域
	 *
	 * @remarks
	 * REF: Section 6.1.2.4
	 */
	private processBends(bends: ECADBend[]): void {
		const { useSimplified } = this.config;

		bends.forEach(bend => {
			const { id, name, bendArea, bendLine, parameters, flexibleZoneId } = bend;

			// # 处理弯曲区域几何
			const bendAreaShapeId = this.processGeometry(bendArea, true);

			// # 处理弯曲轴线
			const bendLineShapeId = this.processLine(bendLine);

			// # 创建曲线集（弯曲区域）
			const bendCurveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
			const bendCurveSet: EDMDCurveSet2D = {
				id: bendCurveSetId,
				ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
				LowerBound: this.createLengthProperty(0),
				UpperBound: this.createLengthProperty(0),
				DetailedGeometricModelElements: [bendAreaShapeId],
			};
			this.curveSets.push(bendCurveSet);

			// # 创建形状元素（弯曲区域）
			const bendShapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
			const bendShapeElement: EDMDShapeElement = {
				id: bendShapeElementId,
				ShapeElementType: ShapeElementType.NonFeatureShapeElement,
				Inverted: false,
				DefiningShape: bendCurveSetId,
			};
			this.shapeElements.push(bendShapeElement);

			// # 创建曲线集（弯曲轴线）
			const lineCurveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
			const lineCurveSet: EDMDCurveSet2D = {
				id: lineCurveSetId,
				ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
				LowerBound: this.createLengthProperty(0),
				UpperBound: this.createLengthProperty(0),
				DetailedGeometricModelElements: [bendLineShapeId],
			};
			this.curveSets.push(lineCurveSet);

			// # 创建形状元素（弯曲轴线）
			const lineShapeElementId = this.generateId(IDXBuilderIDPre.ShapeElement);
			const lineShapeElement: EDMDShapeElement = {
				id: lineShapeElementId,
				ShapeElementType: ShapeElementType.NonFeatureShapeElement,
				Inverted: false,
				DefiningShape: lineCurveSetId,
			};
			this.shapeElements.push(lineShapeElement);

			// # 创建弯曲项目定义
			const bendSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
			const bendSingle: EDMDItemSingle = {
				id: bendSingleId,
				Name: name,
				ItemType: ItemType.SINGLE,
				Shape: bendShapeElementId,
			};

			// # 传统方式建模
			if (!useSimplified) {
				// 创建EDMDBend对象
				// TODO: 实现EDMDBend类型
				// 这里暂时使用FunctionalItemShape
				const functionalItemId = this.generateId(
					IDXBuilderIDPre.ThirdItem
				);
				const functionalItem: EDMDFunctionalItemShape = {
					id: functionalItemId,
					type: IDXPDMTag.EDMDFunctionalItemShape,
					ShapeElement: bendShapeElementId,
					FunctionalItemShapeType: FunctionalItemShapeType.FlexibleArea,
				};

				this.thirdItems.push(functionalItem);
				bendSingle.Shape = functionalItemId;
			}

			this.itemsSingle.push(bendSingle);

			// # 创建弯曲装配
			const bendAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
			const bendInstanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
			const bendInstance: EDMDItemInstance = {
				id: bendInstanceId,
				Item: bendSingleId,
				InstanceName: this.createEDMDName(name),
			};
			if (parameters.sequenceNumber) {
				bendInstance.bendSequenceNumber =
					parameters.sequenceNumber;
			}

			const bendAssembly: EDMDItemAssembly = {
				id: bendAssemblyId,
				Name: name,
				ItemType: ItemType.ASSEMBLY,
				geometryType: EDMDGeometryType.BEND,
				ItemInstances: [bendInstance],
			};

			// # 添加弯曲参数作为用户属性
			const userProperties: EDMDUserSimpleProperty[] = [
				this.createUserSimpleProperty(
					'innerSide',
					parameters.innerSide
				),
				this.createUserSimpleProperty(
					'innerRadius',
					parameters.innerRadius
				),
				this.createUserSimpleProperty(
					'bendAngle',
					parameters.bendAngle
				),
			];

			bendAssembly.UserProperties = userProperties;

			if (!useSimplified) {
				delete bendAssembly.geometryType;
			}

			this.itemsAssembly.push(bendAssembly);
		});
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
			MCADFormat: format,
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
		this.models3D.push(idxModel);
		return modelId;
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
		const { packageName, geometry, pins, thermalProperties, valueProperties, model3dId } = footprint;

		// # 处理封装轮廓几何
		const outlineShapeId = this.processGeometry(geometry.outline, true);

		// # 创建曲线集（封装高度通常为0，表示2D轮廓）
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: this.createLengthProperty(0),
			UpperBound: this.createLengthProperty(0),
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

		// # 添加热属性
		if (thermalProperties) {
			const userProperties: EDMDUserSimpleProperty[] = [];
			if (thermalProperties.powerMax !== undefined) {
				userProperties.push(
					this.createUserSimpleProperty(
						'POWER_MAX',
						thermalProperties.powerMax
					)
				);
			}
			if (thermalProperties.powerOp !== undefined) {
				userProperties.push(
					this.createUserSimpleProperty(
						'POWER_OPR',
						thermalProperties.powerOp
					)
				);
			}
			if (thermalProperties.thermalCond !== undefined) {
				userProperties.push(
					this.createUserSimpleProperty(
						'THERM_COND',
						thermalProperties.thermalCond
					)
				);
			}
			footprintSingle.UserProperties = userProperties;
		}

		// # 添加电气值属性
		if (valueProperties) {
			const userProperties: EDMDUserSimpleProperty[] = [];
			if (valueProperties.resistance !== undefined) {
				userProperties.push(
					this.createUserSimpleProperty(
						'RESISTANCE',
						valueProperties.resistance
					)
				);
			}
			if (valueProperties.capacitance !== undefined) {
				userProperties.push(
					this.createUserSimpleProperty(
						'CAPACITANCE',
						valueProperties.capacitance
					)
				);
			}
			if (valueProperties.inductance !== undefined) {
				userProperties.push(
					this.createUserSimpleProperty(
						'INDUCTANCE',
						valueProperties.inductance
					)
				);
			}
			if (valueProperties.tolerance !== undefined) {
				userProperties.push(
					this.createUserSimpleProperty(
						'TOLERANCE',
						valueProperties.tolerance
					)
				);
			}
			if (footprintSingle.UserProperties) {
				footprintSingle.UserProperties.push(
					...userProperties
				);
			} else {
				footprintSingle.UserProperties = userProperties;
			}
		}

		// # 添加3D模型引用
		if (model3dId) {
			const modelId = this.model3DIdMap.get(model3dId);
			if (modelId) {
				footprintSingle.EDMD3DModel = modelId;
			}
		}

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
				ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
				LowerBound: this.createLengthProperty(0),
				UpperBound: this.createLengthProperty(0),
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
				const assemblyComponentId = this.generateId(
					IDXBuilderIDPre.AssemblyComponent
				);
				const assemblyComponent: EDMDAssemblyComponent = {
					id: assemblyComponentId,
					type: IDXPDMTag.EDMDAssemblyComponent,
					ShapeElement: shapeElementId,
					AssemblyComponentType: isMechanical
						? AssemblyComponentType.MechanicalItem
						: AssemblyComponentType.Physical,
				};

				this.thirdItems.push(assemblyComponent);
				componentShape = assemblyComponentId;
			} else {
				componentShape = shapeElementId;
			}
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

		this.itemsSingle.push(componentSingle);

		// # 创建元件实例
		const componentInstanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
		const componentInstance: EDMDItemInstance = {
			id: componentInstanceId,
			Item: componentSingleId,
			Transformation: this.createTransformation2D(transformation),
		};
		if (zOffset) {
			componentInstance.zOffset = this.createLengthProperty(zOffset);
		}

		// # 创建元件装配
		const componentAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const geometryType = isMechanical
			? EDMDGeometryType.COMPONENT_MECHANICAL
			: EDMDGeometryType.COMPONENT;
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
		const holeShapeId = this.processGeometry(geometry, true);

		// # 计算Z轴边界
		let lowerBound: EDMDLengthProperty = this.createLengthProperty(0);
		let upperBound: EDMDLengthProperty = this.createLengthProperty(0);
		let assembleToName: string | undefined;

		if (zRange) {
			// 直接指定Z范围
			lowerBound =
				zRange.lowerBound !== undefined
					? this.createLengthProperty(
							zRange.lowerBound
						)
					: lowerBound;
			upperBound =
				zRange.upperBound !== undefined
					? this.createLengthProperty(
							zRange.upperBound
						)
					: upperBound;
		} else if (layerSpan && layerSpan.startLayer && layerSpan.endLayer) {
			// 通过层信息计算Z范围
			const startLayerBounds = this.getLayerBounds(layerSpan.startLayer, stackupId);
			const endLayerBounds = this.getLayerBounds(layerSpan.endLayer, stackupId);

			if (startLayerBounds && endLayerBounds) {
				lowerBound = startLayerBounds.LowerBound;
				upperBound = endLayerBounds.UpperBound;

				// 对于盲孔/埋孔，需要创建对应的层堆叠引用
				if (stackupId) {
					assembleToName =
						this.getLayerStackName(
							stackupId
						);
				}
			}
		} else if (stackupId) {
			// 引用整个层堆叠
			assembleToName = this.getLayerStackName(stackupId);
			// 使用默认值0,0表示使用层堆叠的厚度
			lowerBound = this.createLengthProperty(0);
			upperBound = this.createLengthProperty(0);
		} else {
			// 默认通孔（贯穿整个板厚）
			// 这里使用默认值0,0，实际厚度将由AssembleToName决定
			lowerBound = this.createLengthProperty(0);
			upperBound = this.createLengthProperty(0);
		}

		// # 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: lowerBound,
			UpperBound: upperBound,
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

		// # 焊盘堆栈引用
		if (padstackName) {
			holeSingle.PackageName = this.createEDMDName(padstackName);
		}

		// # 传统方式建模
		if (!useSimplified) {
			const interStratumFeatureId = this.generateId(
				IDXBuilderIDPre.InterStratumFeature
			);
			let interStratumFeatureType: InterStratumFeatureType;

			switch (type) {
				case ECADHoleType.PTH:
					interStratumFeatureType =
						isMilled
							? InterStratumFeatureType.MilledCutout
							: InterStratumFeatureType.PlatedCutout;
					break;
				case ECADHoleType.NPTH:
					interStratumFeatureType =
						isMilled
							? InterStratumFeatureType.MilledCutout
							: InterStratumFeatureType.Cutout;
					break;
				case ECADHoleType.VIA:
					interStratumFeatureType =
						InterStratumFeatureType.Via;
					break;
				case ECADHoleType.FILLED_VIA:
					interStratumFeatureType =
						InterStratumFeatureType.FilledVia;
					break;
				case ECADHoleType.BLIND:
				case ECADHoleType.BURIED:
					interStratumFeatureType =
						InterStratumFeatureType.Via;
					break;
				default:
					interStratumFeatureType =
						InterStratumFeatureType.PlatedCutout;
			}

			const interStratumFeature: EDMDInterStratumFeature = {
				id: interStratumFeatureId,
				type: IDXPDMTag.EDMDInterStratumFeature,
				ShapeElement: shapeElementId,
				InterStratumFeatureType: interStratumFeatureType,
				Stratum: this.boardLayerStackId || '', // 引用板子层
			};

			this.thirdItems.push(interStratumFeature);
			holeSingle.Shape = interStratumFeatureId;
		}

		this.itemsSingle.push(holeSingle);

		// # 创建孔装配
		const instanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
		const itemInstance: EDMDItemInstance = {
			id: instanceId,
			Item: holeSingleId,
		};

		// # 孔类型
		const geometryType = this.convertHoleType(type, isMilled);
		const holeAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const holeAssembly: EDMDItemAssembly = {
			...this.getCommonData(hole),
			id: holeAssemblyId,
			ItemType: ItemType.ASSEMBLY,
			geometryType,
			ItemInstances: [itemInstance],
		};

		// # 添加AssembleToName
		if (assembleToName) {
			holeAssembly.AssembleToName = assembleToName;
		}

		// # 添加铣削属性
		if (isMilled && millDiameter) {
			const userProperties: EDMDUserSimpleProperty[] = [
				this.createUserSimpleProperty(
					'TOOL_DIAMETER',
					millDiameter
				),
			];
			holeAssembly.UserProperties = userProperties;
		}

		// # 传统方式建模
		if (!useSimplified) {
			delete holeAssembly.geometryType;
		}

		this.itemsAssembly.push(holeAssembly);
	}

	/**
	 * 将ECAD孔类型转换为IDX几何类型
	 * @param viaType ECAD孔类型
	 * @returns 对应的IDX几何类型
	 */
	private convertHoleType(viaType: ECADHoleType, isMilled?: boolean): EDMDGeometryType {
		switch (viaType) {
			case ECADHoleType.PTH:
				return isMilled
					? EDMDGeometryType.HOLE_PLATED_MILLED
					: EDMDGeometryType.HOLE_PLATED;
			case ECADHoleType.NPTH:
				return isMilled
					? EDMDGeometryType.HOLE_NONPLATED_MILLED
					: EDMDGeometryType.HOLE_NON_PLATED;
			case ECADHoleType.VIA:
				return EDMDGeometryType.VIA;
			case ECADHoleType.FILLED_VIA:
				return EDMDGeometryType.FILLED_VIA;
			case ECADHoleType.BLIND:
			case ECADHoleType.BURIED:
				// 盲孔和埋孔在IDX中通常用VIA表示，通过z范围区分
				return EDMDGeometryType.VIA;
			default:
				// 默认返回电镀孔
				return EDMDGeometryType.HOLE_PLATED;
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
		const constraintShapeId = this.processGeometry(geometry, true);

		// # 创建曲线集
		// ## 确定Z范围
		let lowerBound: EDMDLengthProperty = this.createLengthProperty(0);
		let upperBound: EDMDLengthProperty = this.createLengthProperty(0);
		const assembleToName = layerId ? this.getLayerName(layerId) : undefined;

		if (zRange) {
			lowerBound =
				zRange.lowerBound !== undefined
					? this.createLengthProperty(
							zRange.lowerBound
						)
					: lowerBound;
			upperBound =
				zRange.upperBound !== undefined
					? this.createLengthProperty(
							zRange.upperBound
						)
					: upperBound;
		} else if (layerId) {
			// 如果没有指定Z范围但指定了层，使用层的厚度
			const layerBounds = this.getLayerBounds(layerId);
			if (layerBounds) {
				lowerBound = layerBounds.LowerBound;
				upperBound = layerBounds.UpperBound;
			}
		}

		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: lowerBound,
			UpperBound: upperBound,
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

		// # 传统方式建模
		const { useSimplified } = this.config;
		if (!useSimplified) {
			if (type === 'KEEPOUT') {
				const keepOutId = this.generateId(
					IDXBuilderIDPre.KeepOut
				);
				const keepOut: EDMDKeepOut = {
					id: keepOutId,
					type: IDXPDMTag.EDMDKeepOut,
					ShapeElement: shapeElementId,
					Purpose: this.convertConstraintPurpose(
						purpose
					) as KeepConstraintPurpose,
				};

				this.thirdItems.push(keepOut);
				constraintSingle.Shape = keepOutId;
			} else {
				const keepInId = this.generateId(
					IDXBuilderIDPre.KeepIn
				);
				const keepIn: EDMDKeepIn = {
					id: keepInId,
					type: IDXPDMTag.EDMDKeepIn,
					ShapeElement: shapeElementId,
					Purpose: this.convertConstraintPurpose(
						purpose
					) as KeepConstraintPurpose,
				};

				this.thirdItems.push(keepIn);
				constraintSingle.Shape = keepInId;
			}
		}

		this.itemsSingle.push(constraintSingle);

		// # 创建约束实例
		const instanceId = this.generateId(IDXBuilderIDPre.ItemInstance);
		const itemInstance: EDMDItemInstance = {
			id: instanceId,
			Item: constraintSingleId,
		};

		// # 创建约束装配
		const geometryType = this.convertConstraintType(type, purpose);
		const constraintAssemblyId = this.generateId(IDXBuilderIDPre.ItemAssembly);
		const constraintAssembly: EDMDItemAssembly = {
			...this.getCommonData(constraint),
			ItemType: ItemType.ASSEMBLY,
			id: constraintAssemblyId,
			geometryType,
			ItemInstances: [itemInstance],
		};

		// # 添加AssembleToName
		if (assembleToName) {
			constraintAssembly.AssembleToName = assembleToName;
		}

		// # 传统方式建模
		if (!useSimplified) {
			delete constraintAssembly.geometryType;
		}

		this.itemsAssembly.push(constraintAssembly);
	}

	/**
	 * 获取约束类型的geometryType
	 */
	private convertConstraintType(type: 'KEEPOUT' | 'KEEPIN', purpose: ECADConstraintPurpose): EDMDGeometryType {
		const prefix = type === 'KEEPOUT' ? 'KEEPOUT_AREA' : 'KEEPIN_AREA';

		switch (purpose) {
			case 'ROUTE':
				return `${prefix}_ROUTE` as EDMDGeometryType;
			case 'COMPONENT':
				return `${prefix}_COMPONENT` as EDMDGeometryType;
			case 'VIA':
				return `${prefix}_VIA` as EDMDGeometryType;
			case 'TESTPOINT':
				return `${prefix}_TESTPOINT` as EDMDGeometryType;
			case 'THERMAL':
				return type === 'KEEPOUT'
					? EDMDGeometryType.KEEPOUT_AREA_THERMAL
					: EDMDGeometryType.KEEPIN_AREA_THERMAL;
			case 'OTHER':
			default:
				return `${prefix}_OTHER` as EDMDGeometryType;
		}
	}

	/**
	 * 转换约束目的到KeepConstraintPurpose
	 */
	private convertConstraintPurpose(purpose: ECADConstraintPurpose): KeepConstraintPurpose | string {
		switch (purpose) {
			case 'ROUTE':
				return KeepConstraintPurpose.Route;
			case 'COMPONENT':
				return KeepConstraintPurpose.ComponentPlacement;
			case 'VIA':
				return KeepConstraintPurpose.Via;
			case 'TESTPOINT':
				return KeepConstraintPurpose.TestPoint;
			case 'THERMAL':
				return KeepConstraintPurpose.Thermal;
			case 'OTHER':
			default:
				return KeepConstraintPurpose.Other;
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
		// # 处理走线几何
		const traceShapeId = this.processGeometry(trace.geometry);

		// # 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: this.createLengthProperty(0),
			UpperBound: this.createLengthProperty(0),
			DetailedGeometricModelElements: [traceShapeId],
		};

		// # 如果有宽度，添加为属性
		if (trace.width > 0) {
			// 对于Polyline，可以设置Thickness属性
			const geometry = this.geometryMap.get(traceShapeId);
			if (geometry && geometry.type === IDXD2Tag.EDMDPolyLine) {
				(geometry as EDMDPolyLine).Thickness =
					this.createLengthProperty(
						trace.width
					);
			}
		}

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

		// # 创建走线项目（非协作，仅作为参考）
		const traceSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const traceSingle: EDMDItemSingle = {
			id: traceSingleId,
			Name: trace.netName || 'Trace',
			ItemType: ItemType.SINGLE,
			Shape: shapeElementId,
		};

		// # 添加网络信息作为用户属性
		if (trace.netName) {
			traceSingle.UserProperties = [
				this.createUserSimpleProperty(
					'NET_NAME',
					trace.netName
				),
			];
		}

		this.itemsSingle.push(traceSingle);
	}

	/**
	 * 处理铜皮区域
	 */
	private processCopperArea(area: ECADCopperArea): void {
		// # 处理铜皮几何
		const areaShapeId = this.processGeometry(area.geometry, true);

		// # 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: this.createLengthProperty(0),
			UpperBound: this.createLengthProperty(0),
			DetailedGeometricModelElements: [areaShapeId],
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

		// # 创建铜皮项目（非协作，仅作为参考）
		const areaSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const areaSingle: EDMDItemSingle = {
			id: areaSingleId,
			Name: area.isPlane ? 'Copper Plane' : 'Copper Area',
			ItemType: ItemType.SINGLE,
			Shape: shapeElementId,
		};

		// # 添加平面类型信息
		if (area.isPlane) {
			areaSingle.UserProperties = [this.createUserSimpleProperty('IS_PLANE', true)];
		}

		this.itemsSingle.push(areaSingle);
	}

	/**
	 * 处理丝印
	 */
	private processSilkscreen(silkscreen: ECADSilkscreen): void {
		// # 处理丝印几何
		const silkscreenShapeId = this.processGeometry(silkscreen.geometry);

		// # 创建曲线集
		const curveSetId = this.generateId(IDXBuilderIDPre.CurveSet);
		const curveSet: EDMDCurveSet2D = {
			id: curveSetId,
			ShapeDescriptionType: CurveSet2DShapeDescType.GeometricModel,
			LowerBound: this.createLengthProperty(0),
			UpperBound: this.createLengthProperty(0),
			DetailedGeometricModelElements: [silkscreenShapeId],
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

		// # 创建丝印项目（非协作，仅作为参考）
		const silkscreenSingleId = this.generateId(IDXBuilderIDPre.ItemSingle);
		const silkscreenSingle: EDMDItemSingle = {
			id: silkscreenSingleId,
			Name: silkscreen.text || 'Silkscreen',
			ItemType: ItemType.SINGLE,
			Shape: shapeElementId,
		};

		// # 添加文本信息
		if (silkscreen.text) {
			silkscreenSingle.UserProperties = [
				this.createUserSimpleProperty(
					'TEXT',
					silkscreen.text
				),
			];
		}

		this.itemsSingle.push(silkscreenSingle);
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
