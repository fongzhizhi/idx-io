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
	ECADObject
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
    EDMDStratumTechnology,
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
	EDMDBaseGeometry
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
    private config  = DefaultIDXBuildConfig;
    
	// ------------ 构建过程中的中间数据 ------------
	/** ID计数器表 */
    private idCounterMap = new Map<string, number>();
	/** ID映射表 */
    private idMap = new Map<string, string>(); // ECAD ID -> IDX ID 映射
    /** 点集合(pointHash -> CartesianPoint) */
	private pointMap = new Map<number, CartesianPoint>();
    private geometries: EDMDGeometry[] = [];
    private curveSets: EDMDCurveSet2D[] = [];
    private shapeElements: EDMDShapeElement[] = [];
    private stratumTechnologies: EDMDStratumTechnology[] = [];
    private strata: EDMDStratum[] = [];
    private models3D: EDMDModel3D[] = [];
    private itemsSingle: EDMDItemSingle[] = [];
    private itemsAssembly: EDMDItemAssembly[] = [];
    private histories: EDMDHistory[] = [];

	/** IDX 模型构建器 */
    constructor(config?: Partial<IDXBuildConfig>) {
		if(config) {
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
        this.idMap.clear();
        this.pointMap.clear();
        this.geometries = [];
        this.curveSets = [];
        this.shapeElements = [];
        this.stratumTechnologies = [];
        this.strata = [];
        this.models3D = [];
        this.itemsSingle = [];
        this.itemsAssembly = [];
        this.histories = [];
    }

	 /**
     * 生成唯一ID
     */
    private generateId(prefix: string): string {
		const idCounterMap = this.idCounterMap;
		if(!idCounterMap.has(prefix)) {
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
        
		if(ecadObj.name) {
			itemBaseData.Name = ecadObj.name;
		}

		if(ecadObj.description) {
			itemBaseData.Description = ecadObj.description;
		}

		if(isValidBool(ecadObj.isAttrChanged)) {
			itemBaseData.IsAttributeChanged = ecadObj.isAttrChanged;
		}

		
		if(ecadObj.identifier) {
			itemBaseData.Identifier = ecadObj.identifier;
		}
		
		if(isValidBool(ecadObj.baseLine)) {
			itemBaseData.BaseLine = ecadObj.baseLine;
		}

        if (ecadObj.userProperties) {
            itemBaseData.UserProperties = ecadObj.userProperties;
        }
        
        if (ecadObj.roles ) {
            itemBaseData.Roles = ecadObj.roles;
        }
        
        return itemBaseData;
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
            ModifiedDateTime: metadata.timestamps.modified || metadata.timestamps.created
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
        // # 处理板子
        this.processBoard(ecadData.board);
        
        // # 处理层和层堆叠
        if (ecadData.layers && ecadData.stackups) {
            this.processLayersAndStackups(ecadData.layers, ecadData.stackups);
        }
        
        // # 处理层区域（刚柔结合板）
        if (ecadData.board.zones) {
            this.processLayerZones(ecadData.board.zones);
        }
        
        // # 处理弯曲区域（柔性板）
        if (ecadData.board.bends) {
            this.processBends(ecadData.board.bends);
        }
        
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
        const pointId = this.generateId('PT');
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
    private processLine(line: Line, type: string): string {
        // # 创建点
        const startPointId = this.createPoint(line.start);
        const endPointId = this.createPoint(line.end);
        
        // # 创建直线几何
        const lineId = this.generateId('GEO');
        const lineGeometry: EDMDLine = {
            id: lineId,
			type: IDXD2Tag.EDMDLine,
            Point: startPointId,
            Vector: endPointId,
        };
        this.geometries.push(lineGeometry);
        
        return lineId;
    }

    /**
     * 处理圆弧几何
     */
    private processArc(arc: Arc, type: string): string {
        // 创建点
        const startPointId = this.createPoint(arc.start);
        const midPointId = this.createPoint(arc.mid);
        const endPointId = this.createPoint(arc.end);
        
        // 创建圆弧几何
        const arcId = this.generateId('GEO');
        const arcGeometry: EDMDGeometry = {
            id: arcId,
            type: 'Arc',
            StartPoint: startPointId,
            MidPoint: midPointId,
            EndPoint: endPointId
        };
        this.geometries.push(arcGeometry);
        
        return arcId;
    }

    /**
     * 处理圆形几何
     */
    private processCircle(circle: Circle, type: string): string {
        // 创建圆心点
        const centerPointId = this.createPoint(circle.center);
        
        // 创建圆形几何
        const circleId = this.generateId('GEO');
        const circleGeometry: EDMDGeometry = {
            id: circleId,
            type: 'CircleCenter',
            CenterPoint: centerPointId,
            Diameter: { Value: circle.diameter }
        };
        this.geometries.push(circleGeometry);
        
        return circleId;
    }

    /**
     * 处理多段线几何
     */
    private processPolyline(polyline: Polyline, type: string): string {
        // 创建所有点
        const pointIds = polyline.points.map(point => this.createPoint(point));
        
        // 创建多段线几何
        const polylineId = this.generateId('GEO');
        const polylineGeometry: EDMDGeometry = {
            id: polylineId,
            type: 'PolyLine',
            Points: pointIds,
            Closed: polyline.isClosed()
        };
        
        // 如果有厚度属性（用于走线、铣削路径）
        if (polyline.thickness !== undefined) {
            polylineGeometry.Thickness = { Value: polyline.thickness };
        }
        
        this.geometries.push(polylineGeometry);
        
        return polylineId;
    }

    /**
     * 处理矩形几何（转换为多段线）
     */
    private processRect(rect: Rect, type: string): string {
        // 将矩形转换为多段线
        const points = [
            rect.topLeft,
            { x: rect.topLeft.x + rect.width, y: rect.topLeft.y },
            { x: rect.topLeft.x + rect.width, y: rect.topLeft.y + rect.height },
            { x: rect.topLeft.x, y: rect.topLeft.y + rect.height }
        ];
        
        const polyline = new Polyline(points, true);
        return this.processPolyline(polyline, type);
    }

	 /**
     * 处理几何对象
     * 
     * @param geometry ECAD几何对象
     * @param type 几何类型标识
     * @returns 生成的IDX几何ID
     */
    private processGeometry(geometry: ECADGeometry, type: string): string {
        // 根据几何类型处理
        if (geometry instanceof Line) {
            return this.processLine(geometry, type);
        } else if (geometry instanceof Arc) {
            return this.processArc(geometry, type);
        } else if (geometry instanceof Circle) {
            return this.processCircle(geometry, type);
        } else if (geometry instanceof Polyline) {
            return this.processPolyline(geometry, type);
        } else if (geometry instanceof Rect) {
            return this.processRect(geometry, type);
        } else {
            throw new Error(`Unsupported geometry type: ${geometry.constructor.name}`);
        }
    }
	

    /**
     * 处理PCB板
     * 
     * @remarks
     * 板子可以是简单板（厚度）或复杂板（层堆叠）。
     * REF: Section 6.1
     */
    private processBoard(board: ECADBoard): void {
        // 1. 处理板轮廓几何
        const boardShapeId = this.processGeometry(board.outline, 'BOARD_OUTLINE');
        
        // 2. 创建曲线集
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: 0 },
            UpperBound: { Value: board.thickness || 1.6 }, // 默认1.6mm
            DetailedGeometricModelElement: boardShapeId
        };
        this.curveSets.push(curveSet);
        
        // 3. 创建形状元素（板子轮廓，添加材料）
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: 'FeatureShapeElement',
            Inverted: false, // 添加材料
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 4. 处理板子特征（切割区域）
        if (board.features?.cutouts) {
            board.features.cutouts.forEach(cutout => {
                this.processBoardCutout(cutout, board.thickness || 1.6);
            });
        }
        
        // 5. 处理铣削路径
        if (board.features?.milling) {
            board.features.milling.forEach(milling => {
                this.processMillingPath(milling, board);
            });
        }
        
        // 6. 创建板子项目定义（Item single）
        const boardSingleId = this.generateId('IS');
        const boardSingle: EDMDItemSingle = {
            id: boardSingleId,
            Name: board.name || 'PCB Board',
            Description: board.description || 'Main PCB board',
            ItemType: 'single',
            Identifier: board.identifier || this.createIdentifier('BOARD'),
            Shape: this.config.useSimplifiedFormat ? shapeElementId : this.createBoardStratum(shapeElementId),
            BaseLine: board.baseLine !== false, // 默认为基线
            ...this.getCommonData(board)
        };
        
        // 如果使用传统方式，需要设置Shape为Stratum
        if (!this.config.useSimplifiedFormat) {
            boardSingle.Shape = this.createBoardStratum(shapeElementId);
        }
        
        this.itemsSingle.push(boardSingle);
        
        // 7. 创建板子实例（Item assembly）
        const boardAssemblyId = this.generateId('IA');
        const boardAssembly: EDMDItemAssembly = {
            id: boardAssemblyId,
            Name: board.name || 'PCB Assembly',
            Description: board.description || 'Board assembly',
            ItemType: 'assembly',
            geometryType: 'BOARD_OUTLINE', // 简化方式
            ItemInstance: [{
                id: this.generateId('INST'),
                Item: boardSingleId,
                InstanceName: board.name || 'Board',
                Transformation: this.createTransformation2D({ x: 0, y: 0 }, 0),
                ...this.extractInstanceProperties(board)
            }],
            BaseLine: board.baseLine !== false,
            ...this.getCommonData(board)
        };
        
        // 如果使用传统方式，不设置geometryType
        if (!this.config.useSimplifiedFormat) {
            delete boardAssembly.geometryType;
        }
        
        this.itemsAssembly.push(boardAssembly);
        
        // 保存ID映射
        if (board.identifier) {
            this.idMap.set(board.identifier.SystemScope + board.identifier.Number, boardAssemblyId);
        }
    }

    /**
     * 处理板子切割区域
     */
    private processBoardCutout(cutout: ECADClosedGeometry, boardThickness: number): void {
        // 1. 处理切割几何
        const cutoutShapeId = this.processGeometry(cutout, 'CUTOUT');
        
        // 2. 创建曲线集（与板子相同Z范围）
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: 0 },
            UpperBound: { Value: boardThickness },
            DetailedGeometricModelElement: cutoutShapeId
        };
        this.curveSets.push(curveSet);
        
        // 3. 创建形状元素（切割，减去材料）
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: 'FeatureShapeElement',
            Inverted: true, // 减去材料
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 4. 创建切割项目（作为板子的子项）
        const cutoutSingleId = this.generateId('IS');
        const cutoutSingle: EDMDItemSingle = {
            id: cutoutSingleId,
            Name: 'Cutout',
            ItemType: 'single',
            Shape: shapeElementId
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
        const pathShapeId = this.processGeometry(milling.path, 'MILLING_PATH');
        
        // 2. 创建曲线集（指定深度范围）
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: 0 },
            UpperBound: { Value: milling.depth || board.thickness || 1.6 },
            DetailedGeometricModelElement: pathShapeId
        };
        this.curveSets.push(curveSet);
        
        // 3. 创建形状元素
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: milling.isPlated ? 'PartMountingFeature' : 'FeatureShapeElement',
            Inverted: true, // 减去材料
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 4. 创建铣削项目
        const millingSingleId = this.generateId('IS');
        const millingSingle: EDMDItemSingle = {
            id: millingSingleId,
            Name: 'Milled Cutout',
            ItemType: 'single',
            Shape: shapeElementId
        };
        this.itemsSingle.push(millingSingle);
        
        // 5. 如果需要，可以创建铣削实例
    }

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
     * 处理单个层定义
     */
    private processLayer(layer: ECADLayer): void {
        // 创建层技术定义
        const technologyId = this.generateId('TECH');
        const technology: EDMDStratumTechnology = {
            id: technologyId,
            TechnologyType: 'Design',
            LayerPurpose: this.convertLayerType(layer.type)
        };
        this.stratumTechnologies.push(technology);
        
        // 创建层项目（Item single）
        const layerSingleId = this.generateId('IS');
        const layerSingle: EDMDItemSingle = {
            id: layerSingleId,
            Name: layer.name,
            Description: `${layer.type} layer`,
            ItemType: 'single',
            Identifier: this.createIdentifier(`LAYER_${layer.id}`),
            Shape: technologyId, // 层通过StratumTechnology定义
            UserProperties: [
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'LayerType'
                    },
                    Value: layer.type
                },
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'Thickness'
                    },
                    Value: layer.thickness.toString()
                }
            ]
        };
        this.itemsSingle.push(layerSingle);
        
        // 创建层实例（Item assembly）
        const layerAssemblyId = this.generateId('IA');
        const layerAssembly: EDMDItemAssembly = {
            id: layerAssemblyId,
            Name: layer.name,
            ItemType: 'assembly',
            geometryType: this.convertLayerTypeToGeometryType(layer.type),
            ReferenceName: layer.name, // 用于AssembleToName引用
            ItemInstance: [{
                id: this.generateId('INST'),
                Item: layerSingleId,
                InstanceName: layer.name
            }],
            UserProperties: [
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'LowerBound'
                    },
                    Value: '0' // 需要在堆叠中设置
                },
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'UpperBound'
                    },
                    Value: layer.thickness.toString()
                }
            ]
        };
        this.itemsAssembly.push(layerAssembly);
    }

    /**
     * 处理层堆叠
     */
    private processLayerStackup(stackup: ECADLayerStackup, allLayers: ECADLayer[]): void {
        // 创建层堆叠项目（Item assembly）
        const stackupId = this.generateId('IA');
        
        // 收集堆叠中的层实例
        const layerInstances = stackup.layers.map((layerId, index) => {
            const layer = allLayers.find(l => l.id === layerId);
            if (!layer) return null;
            
            // 找到对应的层项目
            const layerAssembly = this.itemsAssembly.find(ia => 
                ia.Name === layer.name && 
                ia.geometryType === this.convertLayerTypeToGeometryType(layer.type)
            );
            
            if (!layerAssembly) return null;
            
            return {
                id: this.generateId('INST'),
                Item: layerAssembly.id,
                InstanceName: layer.name,
                UserProperties: [
                    {
                        Key: {
                            SystemScope: this.config.systemScope,
                            ObjectName: 'LayerType'
                        },
                        Value: layer.type
                    }
                ]
            };
        }).filter(instance => instance !== null);
        
        const stackupAssembly: EDMDItemAssembly = {
            id: stackupId,
            Name: stackup.name,
            Description: `Layer stackup: ${stackup.layers.length} layers`,
            ItemType: 'assembly',
            geometryType: 'LAYER_STACKUP',
            ItemInstance: layerInstances,
            ReferenceName: stackup.referenceName,
            UserProperties: [
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'TotalThickness'
                    },
                    Value: stackup.thickness.toString()
                }
            ]
        };
        
        this.itemsAssembly.push(stackupAssembly);
    }

    /**
     * 处理层区域
     * 
     * @remarks
     * REF: Section 6.1.2.3
     */
    private processLayerZones(zones: ECADLayerZone[]): void {
        zones.forEach(zone => {
            // 1. 处理区域几何
            const zoneShapeId = this.processGeometry(zone.geometry, 'LAYER_ZONE');
            
            // 2. 创建曲线集
            const curveSetId = this.generateId('CS');
            // 这里需要根据关联的堆叠计算Z范围
            const curveSet: EDMDCurveSet2D = {
                id: curveSetId,
                ShapeDescriptionType: 'GeometricModel',
                LowerBound: { Value: 0 },
                UpperBound: { Value: 1.0 }, // 默认值，实际应根据堆叠计算
                DetailedGeometricModelElement: zoneShapeId
            };
            this.curveSets.push(curveSet);
            
            // 3. 创建形状元素
            const shapeElementId = this.generateId('SH');
            const shapeElement: EDMDShapeElement = {
                id: shapeElementId,
                ShapeElementType: 'FeatureShapeElement',
                Inverted: false,
                DefiningShape: curveSetId
            };
            this.shapeElements.push(shapeElement);
            
            // 4. 创建功能形状
            const functionalShapeId = this.generateId('FS');
            // 注意：这里简化处理，实际应创建FunctionalItemShape对象
            
            // 5. 创建区域项目
            const zoneSingleId = this.generateId('IS');
            const zoneSingle: EDMDItemSingle = {
                id: zoneSingleId,
                Name: zone.name,
                ItemType: 'single',
                Shape: shapeElementId
            };
            this.itemsSingle.push(zoneSingle);
            
            // 6. 创建区域实例
            const zoneAssemblyId = this.generateId('IA');
            const geometryType = this.getZoneGeometryType(zone.zoneType);
            
            const zoneAssembly: EDMDItemAssembly = {
                id: zoneAssemblyId,
                Name: zone.name,
                ItemType: 'assembly',
                geometryType: geometryType,
                ItemInstance: [{
                    id: this.generateId('INST'),
                    Item: zoneSingleId,
                    InstanceName: zone.name
                }],
                AssembleToName: zone.stackupId // 引用层堆叠
            };
            
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
        bends.forEach(bend => {
            // 1. 处理弯曲区域几何
            const bendAreaShapeId = this.processGeometry(bend.bendArea, 'BEND_AREA');
            
            // 2. 处理弯曲线
            const bendLineShapeId = this.processGeometry(bend.bendLine, 'BEND_LINE');
            
            // 3. 创建曲线集（弯曲区域）
            const curveSetId = this.generateId('CS');
            const curveSet: EDMDCurveSet2D = {
                id: curveSetId,
                ShapeDescriptionType: 'GeometricModel',
                LowerBound: { Value: 0 },
                UpperBound: { Value: 1.0 }, // 需要根据实际情况计算
                DetailedGeometricModelElement: bendAreaShapeId
            };
            this.curveSets.push(curveSet);
            
            // 4. 创建形状元素
            const shapeElementId = this.generateId('SH');
            const shapeElement: EDMDShapeElement = {
                id: shapeElementId,
                ShapeElementType: 'NonFeatureShapeElement', // 弯曲区域为非特征形状
                Inverted: false,
                DefiningShape: curveSetId
            };
            this.shapeElements.push(shapeElement);
            
            // 5. 创建弯曲项目
            const bendSingleId = this.generateId('IS');
            const bendSingle: EDMDItemSingle = {
                id: bendSingleId,
                Name: bend.name,
                ItemType: 'single',
                Shape: shapeElementId
            };
            this.itemsSingle.push(bendSingle);
            
            // 6. 创建弯曲实例
            const bendAssemblyId = this.generateId('IA');
            const bendAssembly: EDMDItemAssembly = {
                id: bendAssemblyId,
                Name: bend.name,
                ItemType: 'assembly',
                geometryType: 'BEND',
                ItemInstance: [{
                    id: this.generateId('INST'),
                    Item: bendSingleId,
                    InstanceName: bend.name,
                    UserProperties: [
                        {
                            Key: {
                                SystemScope: this.config.systemScope,
                                ObjectName: 'BendSequenceNumber'
                            },
                            Value: bend.parameters.sequenceNumber?.toString() || '1'
                        }
                    ]
                }]
            };
            
            this.itemsAssembly.push(bendAssembly);
        });
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
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: 0 },
            UpperBound: { Value: 0 },
            DetailedGeometricModelElement: outlineShapeId
        };
        this.curveSets.push(curveSet);
        
        // 3. 创建形状元素
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: 'FeatureShapeElement',
            Inverted: false,
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 4. 处理引脚
        const pinElements = footprint.pins.map(pin => {
            if (pin.geometry) {
                const pinShapeId = this.processGeometry(pin.geometry, 'PIN');
                return {
                    pinNumber: pin.pinNumber,
                    primary: pin.primary,
                    position: pin.position,
                    shapeId: pinShapeId
                };
            }
            return null;
        }).filter(pin => pin !== null);
        
        // 5. 创建封装项目定义（Item single）
        const footprintSingleId = this.generateId('IS');
        const footprintSingle: EDMDItemSingle = {
            id: footprintSingleId,
            Name: footprint.name || footprint.packageName,
            Description: footprint.description || `Footprint: ${footprint.packageName}`,
            ItemType: 'single',
            Identifier: footprint.identifier || this.createIdentifier(`FOOTPRINT_${footprint.packageName}`),
            PackageName: {
                SystemScope: this.config.systemScope,
                ObjectName: footprint.packageName
            },
            Shape: shapeElementId,
            BaseLine: footprint.baseLine !== false,
            ...this.getCommonData(footprint)
        };
        
        // 添加引脚信息（IDXv4.0简化方式）
        if (pinElements.length > 0 && this.config.useSimplifiedFormat) {
            // 这里可以添加PackagePin属性
        }
        
        this.itemsSingle.push(footprintSingle);
        
        // 6. 创建封装实例（Item assembly） - 封装本身通常不需要实例，由元件实例引用
        // 这里我们创建封装实例以便于组织
        const footprintAssemblyId = this.generateId('IA');
        const footprintAssembly: EDMDItemAssembly = {
            id: footprintAssemblyId,
            Name: footprint.name || footprint.packageName,
            ItemType: 'assembly',
            geometryType: 'COMPONENT', // 封装本质上是组件定义
            ItemInstance: [{
                id: this.generateId('INST'),
                Item: footprintSingleId,
                InstanceName: footprint.packageName
            }],
            ...this.getCommonData(footprint)
        };
        
        this.itemsAssembly.push(footprintAssembly);
        
        // 保存ID映射
        if (footprint.identifier) {
            this.idMap.set(footprint.identifier.SystemScope + footprint.identifier.Number, footprintAssemblyId);
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
        const footprintAssembly = this.itemsAssembly.find(ia => 
            ia.Name === component.footprintId || 
            (component.identifier && this.idMap.has(component.identifier.SystemScope + component.identifier.Number))
        );
        
        if (!footprintAssembly) {
            console.warn(`Footprint not found for component: ${component.refDes}`);
            return;
        }
        
        // 2. 创建元件实例（Item assembly）
        const componentAssemblyId = this.generateId('IA');
        const geometryType = component.refDes.startsWith('M') ? 'COMPONENT_MECHANICAL' : 'COMPONENT';
        
        const componentAssembly: EDMDItemAssembly = {
            id: componentAssemblyId,
            Name: component.name || component.refDes,
            Description: component.description || `Component: ${component.refDes}`,
            ItemType: 'assembly',
            geometryType: geometryType,
            ItemInstance: [{
                id: this.generateId('INST'),
                Item: footprintAssembly.id,
                InstanceName: component.refDes,
                Transformation: this.createTransformation2D(
                    component.transformation.position,
                    component.transformation.rotation,
                    component.transformation.mirror
                ),
                UserProperties: [
                    {
                        Key: {
                            SystemScope: this.config.systemScope,
                            ObjectName: 'REFDES'
                        },
                        Value: component.refDes
                    },
                    ...(component.partNumber ? [{
                        Key: {
                            SystemScope: this.config.systemScope,
                            ObjectName: 'PARTNUM'
                        },
                        Value: component.partNumber
                    }] : []),
                    ...(component.value ? [{
                        Key: {
                            SystemScope: this.config.systemScope,
                            ObjectName: 'VALUE'
                        },
                        Value: component.value
                    }] : [])
                ]
            }],
            AssembleToName: component.assembleTo,
            ...(component.zOffset !== undefined ? { zOffset: component.zOffset } : {}),
            BaseLine: component.baseLine !== false,
            ...this.getCommonData(component)
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
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: lowerBound },
            UpperBound: { Value: upperBound },
            DetailedGeometricModelElement: holeShapeId
        };
        this.curveSets.push(curveSet);
        
        // 4. 创建形状元素
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: hole.isMilled ? 'PartMountingFeature' : 'FeatureShapeElement',
            Inverted: hole.type === 'NPTH' ? false : true, // 非电镀孔为添加材料？需要确认
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 5. 确定geometryType
        let geometryType: string;
        if (hole.isMilled) {
            geometryType = hole.type === 'PTH' ? 'HOLE_PLATED_MILLED' : 'HOLE_NONPLATED_MILLED';
        } else {
            geometryType = hole.type === 'PTH' ? 'HOLE_PLATED' : 
                          hole.type === 'NPTH' ? 'HOLE_NON_PLATED' :
                          hole.type === 'VIA' ? 'VIA' :
                          hole.type === 'FILLED_VIA' ? 'FILLED_VIA' : 'HOLE_PLATED';
        }
        
        // 6. 创建孔项目定义（Item single）
        const holeSingleId = this.generateId('IS');
        const holeSingle: EDMDItemSingle = {
            id: holeSingleId,
            Name: hole.name || `Hole ${hole.type}`,
            Description: hole.description || `${hole.type} hole`,
            ItemType: 'single',
            Identifier: hole.identifier || this.createIdentifier(`HOLE_${hole.type}`),
            Shape: shapeElementId,
            BaseLine: hole.baseLine !== false,
            ...this.getCommonData(hole)
        };
        
        // 添加焊盘堆叠名称
        if (hole.padstackName) {
            holeSingle.PackageName = {
                SystemScope: this.config.systemScope,
                ObjectName: hole.padstackName
            };
        }
        
        this.itemsSingle.push(holeSingle);
        
        // 7. 创建孔实例（Item assembly）
        const holeAssemblyId = this.generateId('IA');
        const holeAssembly: EDMDItemAssembly = {
            id: holeAssemblyId,
            Name: hole.name || `Hole ${hole.type}`,
            ItemType: 'assembly',
            geometryType: geometryType,
            ItemInstance: [{
                id: this.generateId('INST'),
                Item: holeSingleId,
                InstanceName: hole.name || `Hole_${this.idCounterMap}`,
                Transformation: this.createTransformation2D({ x: 0, y: 0 }, 0) // 孔的位置在几何中定义
            }],
            AssembleToName: hole.stackupId || hole.layerSpan?.startLayer,
            BaseLine: hole.baseLine !== false,
            ...this.getCommonData(hole)
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
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            ...(lowerBound !== undefined ? { LowerBound: { Value: lowerBound } } : {}),
            ...(upperBound !== undefined ? { UpperBound: { Value: upperBound } } : {}),
            DetailedGeometricModelElement: constraintShapeId
        };
        this.curveSets.push(curveSet);
        
        // 4. 创建形状元素
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: 'FeatureShapeElement',
            Inverted: false, // 约束区域通常不反转
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 5. 确定geometryType
        const geometryType = this.getConstraintGeometryType(constraint.type, constraint.purpose);
        
        // 6. 创建约束项目定义（Item single）
        const constraintSingleId = this.generateId('IS');
        const constraintSingle: EDMDItemSingle = {
            id: constraintSingleId,
            Name: constraint.name || `${constraint.type} ${constraint.purpose}`,
            Description: constraint.description || `${constraint.type} area for ${constraint.purpose}`,
            ItemType: 'single',
            Identifier: constraint.identifier || this.createIdentifier(`${constraint.type}_${constraint.purpose}`),
            Shape: shapeElementId,
            BaseLine: constraint.baseLine !== false,
            ...this.getCommonData(constraint)
        };
        
        this.itemsSingle.push(constraintSingle);
        
        // 7. 创建约束实例（Item assembly）
        const constraintAssemblyId = this.generateId('IA');
        const constraintAssembly: EDMDItemAssembly = {
            id: constraintAssemblyId,
            Name: constraint.name || `${constraint.type} ${constraint.purpose}`,
            ItemType: 'assembly',
            geometryType: geometryType,
            ItemInstance: [{
                id: this.generateId('INST'),
                Item: constraintSingleId,
                InstanceName: constraint.name || `${constraint.type}_${this.idCounterMap}`,
                Transformation: this.createTransformation2D({ x: 0, y: 0 }, 0)
            }],
            AssembleToName: constraint.assembleTo,
            BaseLine: constraint.baseLine !== false,
            ...this.getCommonData(constraint)
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
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: 0 },
            UpperBound: { Value: 0.035 }, // 典型走线高度
            DetailedGeometricModelElement: traceShapeId
        };
        this.curveSets.push(curveSet);
        
        // 创建形状元素
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: 'FeatureShapeElement',
            Inverted: false,
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 创建层技术（用于标识走线层）
        const technologyId = this.generateId('TECH');
        const technology: EDMDStratumTechnology = {
            id: technologyId,
            TechnologyType: 'Design',
            LayerPurpose: 'OtherSignal'
        };
        this.stratumTechnologies.push(technology);
        
        // 创建Stratum
        const stratumId = this.generateId('STRATUM');
        const stratum: EDMDStratum = {
            id: stratumId,
            ShapeElement: shapeElementId,
            StratumTechnology: technologyId,
            StratumType: 'DesignLayerStratum'
        };
        this.strata.push(stratum);
        
        // 创建走线项目
        const traceSingleId = this.generateId('IS');
        const traceSingle: EDMDItemSingle = {
            id: traceSingleId,
            Name: `Trace ${trace.netName || ''}`,
            ItemType: 'single',
            Shape: stratumId,
            UserProperties: [
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'SIDE'
                    },
                    Value: trace.layer.includes('TOP') ? 'TOP' : 'BOTTOM'
                },
                ...(trace.netName ? [{
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'NET'
                    },
                    Value: trace.netName
                }] : [])
            ]
        };
        this.itemsSingle.push(traceSingle);
    }

    /**
     * 处理铜皮区域
     */
    private processCopperArea(area: ECADCopperArea): void {
        const areaShapeId = this.processGeometry(area.geometry, 'COPPER_AREA');
        
        // 创建曲线集
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: 0 },
            UpperBound: { Value: 0.035 }, // 典型铜厚
            DetailedGeometricModelElement: areaShapeId
        };
        this.curveSets.push(curveSet);
        
        // 创建形状元素
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: 'FeatureShapeElement',
            Inverted: false,
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 创建层技术
        const technologyId = this.generateId('TECH');
        const layerPurpose = area.isPlane ? 'PowerOrGround' : 'OtherSignal';
        const technology: EDMDStratumTechnology = {
            id: technologyId,
            TechnologyType: 'Design',
            LayerPurpose: layerPurpose
        };
        this.stratumTechnologies.push(technology);
        
        // 创建Stratum
        const stratumId = this.generateId('STRATUM');
        const stratum: EDMDStratum = {
            id: stratumId,
            ShapeElement: shapeElementId,
            StratumTechnology: technologyId,
            StratumType: 'DesignLayerStratum'
        };
        this.strata.push(stratum);
        
        // 创建铜皮项目
        const areaSingleId = this.generateId('IS');
        const areaSingle: EDMDItemSingle = {
            id: areaSingleId,
            Name: `Copper Area`,
            ItemType: 'single',
            Shape: stratumId,
            UserProperties: [
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'SIDE'
                    },
                    Value: area.layer.includes('TOP') ? 'TOP' : 'BOTTOM'
                }
            ]
        };
        this.itemsSingle.push(areaSingle);
    }

    /**
     * 处理丝印
     */
    private processSilkscreen(silkscreen: ECADSilkscreen): void {
        const silkscreenShapeId = this.processGeometry(silkscreen.geometry, 'SILKSCREEN');
        
        // 创建曲线集（丝印很薄）
        const curveSetId = this.generateId('CS');
        const curveSet: EDMDCurveSet2D = {
            id: curveSetId,
            ShapeDescriptionType: 'GeometricModel',
            LowerBound: { Value: 0 },
            UpperBound: { Value: 0.01 }, // 典型丝印厚度
            DetailedGeometricModelElement: silkscreenShapeId
        };
        this.curveSets.push(curveSet);
        
        // 创建形状元素
        const shapeElementId = this.generateId('SH');
        const shapeElement: EDMDShapeElement = {
            id: shapeElementId,
            ShapeElementType: 'FeatureShapeElement',
            Inverted: false,
            DefiningShape: curveSetId
        };
        this.shapeElements.push(shapeElement);
        
        // 创建层技术
        const technologyId = this.generateId('TECH');
        const technology: EDMDStratumTechnology = {
            id: technologyId,
            TechnologyType: 'Documentation',
            LayerPurpose: 'SilkScreen'
        };
        this.stratumTechnologies.push(technology);
        
        // 创建Stratum
        const stratumId = this.generateId('STRATUM');
        const stratum: EDMDStratum = {
            id: stratumId,
            ShapeElement: shapeElementId,
            StratumTechnology: technologyId,
            StratumType: 'DesignLayerStratum'
        };
        this.strata.push(stratum);
        
        // 创建丝印项目
        const silkscreenSingleId = this.generateId('IS');
        const silkscreenSingle: EDMDItemSingle = {
            id: silkscreenSingleId,
            Name: `Silkscreen ${silkscreen.text || ''}`,
            ItemType: 'single',
            Shape: stratumId,
            UserProperties: [
                {
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'SIDE'
                    },
                    Value: silkscreen.layer.includes('TOP') ? 'TOP' : 'BOTTOM'
                },
                ...(silkscreen.text ? [{
                    Key: {
                        SystemScope: this.config.systemScope,
                        ObjectName: 'TEXT'
                    },
                    Value: silkscreen.text
                }] : [])
            ]
        };
        this.itemsSingle.push(silkscreenSingle);
    }

   

    /**
     * 处理3D模型
     */
    private processModel3D(model: ECADModel3D): string {
        const modelId = this.generateId('MODEL');
        const idxModel: EDMDModel3D = {
            id: modelId,
            ModelIdentifier: model.identifier,
            MCADFormat: this.convertModelFormat(model.format),
            ...(model.version && { ModelVersion: model.version }),
            ...(model.location && { ModelLocation: model.location }),
            ...(model.transformation && { Transformation: model.transformation })
        };
        
        this.models3D.push(idxModel);
        return modelId;
    }

    /**
     * 创建板子Stratum（传统方式）
     */
    private createBoardStratum(shapeElementId: string): string {
        const stratumId = this.generateId('STRATUM');
        const stratum: EDMDStratum = {
            id: stratumId,
            ShapeElement: shapeElementId,
            StratumType: 'DesignLayerStratum',
            StratumSurfaceDesignation: 'PrimarySurface'
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
            ty: { Value: position.y }
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
            Sequence: '0'
        };
    }

    /**
     * 转换层类型
     */
    private convertLayerType(type: ECADLayerType): string {
        const mapping: Record<ECADLayerType, string> = {
            'SIGNAL': 'OtherSignal',
            'POWER_GROUND': 'PowerOrGround',
            'DIELECTRIC': 'Dielectric',
            'SOLDERMASK': 'SolderMask',
            'SILKSCREEN': 'SilkScreen',
            'SOLDERPASTE': 'SolderPaste',
            'PASTEMASK': 'PasteMask',
            'GLUE': 'Glue',
            'GLUEMASK': 'GlueMask',
            'EMBEDDED_CAP_DIELECTRIC': 'EmbeddedPassiveCapacitorDielectric',
            'EMBEDDED_RESISTOR': 'EmbeddedPassiveResistor',
            'GENERIC': 'GenericLayer',
            'OTHER': 'OtherSignal'
        };
        
        return mapping[type] || 'OtherSignal';
    }

    /**
     * 转换层类型到geometryType
     */
    private convertLayerTypeToGeometryType(type: ECADLayerType): string {
        const mapping: Record<ECADLayerType, string> = {
            'SIGNAL': 'LAYER_OTHERSIGNAL',
            'POWER_GROUND': 'LAYER_POWERORGROUND',
            'DIELECTRIC': 'LAYER_DIELECTRIC',
            'SOLDERMASK': 'LAYER_SOLDERMASK',
            'SILKSCREEN': 'LAYER_SILKSCREEN',
            'SOLDERPASTE': 'LAYER_SOLDERPASTE',
            'PASTEMASK': 'LAYER_PASTEMASK',
            'GLUE': 'LAYER_GLUE',
            'GLUEMASK': 'LAYER_GLUEMASK',
            'EMBEDDED_CAP_DIELECTRIC': 'LAYER_EMBEDDED_CAP_DIELECTRIC',
            'EMBEDDED_RESISTOR': 'LAYER_EMBEDDED_RESISTOR',
            'GENERIC': 'LAYER_GENERIC',
            'OTHER': 'LAYER_OTHERSIGNAL'
        };
        
        return mapping[type] || 'LAYER_OTHERSIGNAL';
    }

    /**
     * 获取区域类型的geometryType
     */
    private getZoneGeometryType(zoneType: 'RIGID' | 'FLEXIBLE' | 'STIFFENER'): string {
        switch (zoneType) {
            case 'FLEXIBLE': return 'BOARD_AREA_FLEXIBLE';
            case 'STIFFENER': return 'BOARD_AREA_STIFFENER';
            default: return 'BOARD_AREA_RIGID';
        }
    }

    /**
     * 获取约束类型的geometryType
     */
    private getConstraintGeometryType(type: 'KEEPOUT' | 'KEEPIN', purpose: ECADConstraintPurpose): string {
        const prefix = type === 'KEEPOUT' ? 'KEEPOUT_AREA' : 'KEEPIN_AREA';
        
        switch (purpose) {
            case 'ROUTE': return `${prefix}_ROUTE`;
            case 'COMPONENT': return `${prefix}_COMPONENT`;
            case 'VIA': return `${prefix}_VIA`;
            case 'TESTPOINT': return `${prefix}_TESTPOINT`;
            case 'THERMAL': return `${prefix}_THERMAL`;
            case 'OTHER': return `${prefix}_OTHER`;
            default: return `${prefix}_OTHER`;
        }
    }

    /**
     * 转换模型格式
     */
    private convertModelFormat(format: ECADModel3D['format']): EDMDModel3D['MCADFormat'] {
        const mapping: Record<ECADModel3D['format'], EDMDModel3D['MCADFormat']> = {
            'STEP': 'STEP',
            'STL': 'STL',
            'IGES': 'Catia', // IGES通常与Catia关联
            'PARASOLID': 'SolidEdge',
            'SOLIDWORKS': 'SolidWorks',
            'NX': 'NX',
            'CATIA': 'Catia'
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
        if (this.geometries.length > 0) Body.Geometries = this.geometries;
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
            Description: `Baseline for design: ${metadata.designName}`
        };
        
        return instruction;
    }
}