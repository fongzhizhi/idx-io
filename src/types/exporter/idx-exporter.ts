// ============= IDX导出器数据模型定义 =============
// DESIGN: 集中定义所有导出器使用的数据接口
// REF: Requirements 4.3, 4.4, 4.5
// NOTE: 这些接口定义了IDX导出器的输入数据结构

/**
 * 组件数据接口
 * 
 * @remarks
 * 定义PCB上电子组件的完整信息，包括位置、尺寸、属性等
 * 支持机械和电气组件的统一表示
 * 
 * @example
 * ```typescript
 * const component: ComponentData = {
 *   refDes: "U1",
 *   partNumber: "STM32F407VGT6",
 *   packageName: "LQFP-100",
 *   position: { x: 10.5, y: 20.3, z: 0, rotation: 0 },
 *   dimensions: { width: 14, height: 14, thickness: 1.6 },
 *   layer: "TOP",
 *   pins: [
 *     { number: "1", position: { x: -6.5, y: 6.5 }, diameter: 0.3, shape: "round" }
 *   ]
 * };
 * ```
 */
export interface ComponentData {
  /** 组件参考标识符（如U1, R5, C10） */
  refDes: string;
  
  /** 器件型号/部件号 */
  partNumber: string;
  
  /** 封装名称（如SOIC-8, BGA-256） */
  packageName: string;
  
  /** 组件位置信息 */
  position: Position3D;
  
  /** 组件尺寸信息 */
  dimensions: Dimensions3D;
  
  /** 所在层（TOP/BOTTOM） */
  layer: string;
  
  /** 是否为机械组件（非电气） */
  isMechanical?: boolean;
  
  /** 电气属性 */
  electrical?: {
    /** 网络连接信息 */
    nets?: Record<string, string>;
    /** 电气特性 */
    characteristics?: Record<string, any>;
  };
  
  /** 热特性 */
  thermal?: {
    /** 热阻 */
    thermalResistance?: number;
    /** 最大功耗 */
    maxPowerDissipation?: number;
  };
  
  /** 3D模型引用 */
  model3D?: {
    /** 模型文件路径或标识符 */
    modelIdentifier: string;
    /** 模型格式（STEP, STL等） */
    format: string;
    /** 模型版本 */
    version?: string;
  };
  
  /** 引脚定义 */
  pins?: PinData[];
  
  /** 扩展属性 */
  properties?: Record<string, any>;
}

/**
 * 三维位置信息
 * 
 * @remarks
 * 定义组件在3D空间中的位置和旋转
 * 坐标系遵循右手坐标系，Z轴向上
 */
export interface Position3D {
  /** X坐标（毫米） */
  x: number;
  
  /** Y坐标（毫米） */
  y: number;
  
  /** Z坐标（毫米），可选，默认为0 */
  z?: number;
  
  /** 旋转角度（度），绕Z轴逆时针旋转 */
  rotation: number;
}

/**
 * 三维尺寸信息
 * 
 * @remarks
 * 定义组件的包围盒尺寸
 */
export interface Dimensions3D {
  /** 宽度（X方向，毫米） */
  width: number;
  
  /** 高度（Y方向，毫米） */
  height: number;
  
  /** 厚度（Z方向，毫米） */
  thickness: number;
}

/**
 * 引脚数据接口
 * 
 * @remarks
 * 定义组件引脚的几何和电气信息
 */
export interface PinData {
  /** 引脚编号 */
  number: string;
  
  /** 引脚相对于组件中心的位置 */
  position: { x: number; y: number };
  
  /** 引脚直径（毫米），可选 */
  diameter?: number;
  
  /** 引脚形状 */
  shape?: 'round' | 'square' | 'oval';
  
  /** 连接的网络名称 */
  netName?: string;
  
  /** 引脚类型 */
  pinType?: 'input' | 'output' | 'bidirectional' | 'power' | 'ground' | 'nc';
}

/**
 * 孔数据接口
 * 
 * @remarks
 * 定义PCB上的孔，包括过孔、安装孔、测试孔等
 * 支持镀孔和非镀孔的区分
 * 
 * @example
 * ```typescript
 * const via: HoleData = {
 *   id: "VIA_001",
 *   type: "plated",
 *   position: { x: 15.2, y: 8.7 },
 *   diameter: 0.2,
 *   platingThickness: 0.025,
 *   startLayer: "L1",
 *   endLayer: "L4",
 *   netName: "VCC"
 * };
 * ```
 */
export interface HoleData {
  /** 孔的唯一标识符 */
  id: string;
  
  /** 孔类型 */
  type: 'plated' | 'non-plated';
  
  /** 孔位置 */
  position: { x: number; y: number };
  
  /** 孔直径（毫米） */
  diameter: number;
  
  /** 镀层厚度（毫米），仅镀孔有效 */
  platingThickness?: number;
  
  /** 钻孔深度（毫米），可选，默认为穿透整个板 */
  drillDepth?: number;
  
  /** 起始层 */
  startLayer?: string;
  
  /** 结束层 */
  endLayer?: string;
  
  /** 焊盘直径（毫米） */
  padDiameter?: number;
  
  /** 防焊盘直径（毫米） */
  antiPadDiameter?: number;
  
  /** 连接的网络名称 */
  netName?: string;
  
  /** 过孔类型细分 */
  viaType?: 'through' | 'blind' | 'buried' | 'micro';
  
  /** 孔用途 */
  purpose?: 'via' | 'mounting' | 'test' | 'thermal' | 'tooling';
  
  /** 扩展属性 */
  properties?: Record<string, any>;
}

/**
 * 禁止区数据接口
 * 
 * @remarks
 * 定义PCB上的禁止区域，用于约束布线、组件放置等
 * 支持多种几何形状和约束类型
 * 
 * @example
 * ```typescript
 * const keepout: KeepoutData = {
 *   id: "KEEPOUT_001",
 *   type: "component",
 *   geometry: {
 *     type: "rectangle",
 *     center: { x: 25, y: 15 },
 *     width: 10,
 *     height: 8
 *   },
 *   layers: ["TOP", "BOTTOM"],
 *   height: { min: 0, max: 5 }
 * };
 * ```
 */
export interface KeepoutData {
  /** 禁止区唯一标识符 */
  id: string;
  
  /** 禁止区类型 */
  type: 'component' | 'via' | 'trace' | 'testpoint' | 'thermal' | 'other';
  
  /** 几何形状定义 */
  geometry: GeometryData;
  
  /** 应用的层列表 */
  layers: string[];
  
  /** 高度约束 */
  height?: {
    /** 最小高度（毫米） */
    min: number;
    /** 最大高度（毫米或'infinity'） */
    max: number | 'infinity';
  };
  
  /** 约束目的 */
  purpose?: 'placement' | 'routing' | 'testing' | 'manufacturing' | 'thermal' | 'mechanical';
  
  /** 约束严格程度 */
  severity?: 'error' | 'warning' | 'info';
  
  /** 是否启用 */
  enabled?: boolean;
  
  /** 扩展属性 */
  properties?: Record<string, any>;
}

/**
 * 几何数据接口
 * 
 * @remarks
 * 定义各种几何形状的统一接口
 * 支持矩形、圆形、多边形等常见形状
 */
export interface GeometryData {
  /** 几何类型 */
  type: 'rectangle' | 'circle' | 'polygon';
  
  /** 多边形顶点（用于polygon类型） */
  points?: Array<{ x: number; y: number }>;
  
  /** 圆心位置（用于circle和rectangle类型） */
  center?: { x: number; y: number };
  
  /** 矩形宽度（用于rectangle类型） */
  width?: number;
  
  /** 矩形高度（用于rectangle类型） */
  height?: number;
  
  /** 圆半径（用于circle类型） */
  radius?: number;
  
  /** 旋转角度（度） */
  rotation?: number;
}

/**
 * 层数据接口
 * 
 * @remarks
 * 定义PCB层的物理和电气特性
 * 支持信号层、电源层、阻焊层等各种层类型
 * 
 * @example
 * ```typescript
 * const layer: LayerData = {
 *   id: "L1",
 *   name: "Top Signal",
 *   type: "SIGNAL",
 *   thickness: 0.035,
 *   material: "Copper",
 *   copperWeight: 1,
 *   dielectricConstant: 4.5
 * };
 * ```
 */
export interface LayerData {
  /** 层唯一标识符 */
  id: string;
  
  /** 层名称 */
  name: string;
  
  /** 层类型 */
  type: LayerType;
  
  /** 层厚度（毫米） */
  thickness: number;
  
  /** 层材料 */
  material?: string;
  
  /** 铜重量（oz/ft²），仅导电层 */
  copperWeight?: number;
  
  /** 介电常数，仅介质层 */
  dielectricConstant?: number;
  
  /** 损耗角正切，仅介质层 */
  lossTangent?: number;
  
  /** 表面处理 */
  surfaceFinish?: string;
  
  /** 层颜色（用于可视化） */
  color?: string;
  
  /** 是否可见 */
  visible?: boolean;
  
  /** 扩展属性 */
  properties?: Record<string, any>;
}

/**
 * 层类型枚举
 * 
 * @remarks
 * 定义PCB中支持的层类型
 * 遵循IDX规范的层分类
 */
export enum LayerType {
  /** 信号层 */
  SIGNAL = 'SIGNAL',
  
  /** 电源/地平面层 */
  PLANE = 'PLANE',
  
  /** 阻焊层 */
  SOLDERMASK = 'SOLDERMASK',
  
  /** 丝印层 */
  SILKSCREEN = 'SILKSCREEN',
  
  /** 介质层 */
  DIELECTRIC = 'DIELECTRIC',
  
  /** 其他信号层 */
  OTHERSIGNAL = 'OTHERSIGNAL'
}

/**
 * 层叠结构数据接口
 * 
 * @remarks
 * 定义PCB的层叠顺序和厚度分布
 * 支持复杂的多层板设计
 * 
 * @example
 * ```typescript
 * const stackup: LayerStackupData = {
 *   id: "STACKUP_4L",
 *   name: "4-Layer Standard",
 *   totalThickness: 1.6,
 *   layers: [
 *     { layerId: "L1", position: 1, thickness: 0.035 },
 *     { layerId: "D1", position: 2, thickness: 0.2 },
 *     { layerId: "L2", position: 3, thickness: 0.035 },
 *     { layerId: "CORE", position: 4, thickness: 1.065 },
 *     { layerId: "L3", position: 5, thickness: 0.035 },
 *     { layerId: "D2", position: 6, thickness: 0.2 },
 *     { layerId: "L4", position: 7, thickness: 0.035 }
 *   ]
 * };
 * ```
 */
export interface LayerStackupData {
  /** 层叠结构唯一标识符 */
  id: string;
  
  /** 层叠结构名称 */
  name: string;
  
  /** 总厚度（毫米） */
  totalThickness?: number;
  
  /** 层叠结构描述 */
  description?: string;
  
  /** 层列表（从下到上排序） */
  layers: LayerStackupEntry[];
  
  /** 板类型 */
  boardType?: 'rigid' | 'flexible' | 'rigid-flex';
  
  /** 阻抗控制要求 */
  impedanceControl?: {
    /** 单端阻抗（欧姆） */
    singleEnded?: number;
    /** 差分阻抗（欧姆） */
    differential?: number;
    /** 公差（%） */
    tolerance?: number;
  };
  
  /** 扩展属性 */
  properties?: Record<string, any>;
}

/**
 * 层叠结构条目
 * 
 * @remarks
 * 层叠结构中单个层的定义
 */
export interface LayerStackupEntry {
  /** 引用的层ID */
  layerId: string;
  
  /** 在层叠中的位置（从1开始） */
  position: number;
  
  /** 该层的厚度（毫米） */
  thickness: number;
  
  /** 层的材料（可覆盖层定义中的材料） */
  material?: string;
  
  /** 相对于基准面的Z坐标（毫米） */
  zPosition?: number;
  
  /** 层方向（正常/镜像） */
  orientation?: 'normal' | 'mirrored';
}

/**
 * 板数据接口扩展
 * 
 * @remarks
 * 扩展现有的BoardData接口以支持新的数据类型
 * 保持向后兼容性
 */
export interface ExtendedBoardData {
  /** 板基本信息 */
  id: string;
  name: string;
  
  /** 板轮廓 */
  outline: {
    points: Array<{ x: number; y: number }>;
    thickness: number;
  };
  
  /** 组件列表 */
  components?: ComponentData[];
  
  /** 孔列表 */
  holes?: HoleData[];
  
  /** 禁止区列表 */
  keepouts?: KeepoutData[];
  
  /** 层定义列表 */
  layers?: LayerData[];
  
  /** 层叠结构 */
  layerStackup?: LayerStackupData;
  
  /** 扩展属性 */
  properties?: Record<string, any>;
}

/**
 * 导出源数据接口扩展
 * 
 * @remarks
 * 扩展ExportSourceData接口以支持所有新的数据类型
 * 满足Requirements 1.1, 4.1的要求
 */
export interface ExtendedExportSourceData {
  /** 板数据 */
  board: ExtendedBoardData;
  
  /** 组件数据（可选，也可在board中定义） */
  components?: ComponentData[];
  
  /** 孔数据（可选，也可在board中定义） */
  holes?: HoleData[];
  
  /** 禁止区数据（可选，也可在board中定义） */
  keepouts?: KeepoutData[];
  
  /** 层数据（可选，也可在board中定义） */
  layers?: LayerData[];
  
  /** 层叠结构数据（可选，也可在board中定义） */
  layerStackup?: LayerStackupData;
}

// ============= 类型守卫函数 =============

/**
 * 检查是否为有效的组件数据
 */
export function isValidComponentData(data: any): data is ComponentData {
  return data && 
    typeof data.refDes === 'string' &&
    typeof data.partNumber === 'string' &&
    typeof data.packageName === 'string' &&
    data.position &&
    typeof data.position.x === 'number' &&
    typeof data.position.y === 'number' &&
    typeof data.position.rotation === 'number' &&
    data.dimensions &&
    typeof data.dimensions.width === 'number' &&
    typeof data.dimensions.height === 'number' &&
    typeof data.dimensions.thickness === 'number';
}

/**
 * 检查是否为有效的孔数据
 */
export function isValidHoleData(data: any): data is HoleData {
  return data &&
    typeof data.id === 'string' &&
    (data.type === 'plated' || data.type === 'non-plated') &&
    data.position &&
    typeof data.position.x === 'number' &&
    typeof data.position.y === 'number' &&
    typeof data.diameter === 'number' &&
    data.diameter > 0;
}

/**
 * 检查是否为有效的禁止区数据
 */
export function isValidKeepoutData(data: any): data is KeepoutData {
  return data &&
    typeof data.id === 'string' &&
    ['component', 'via', 'trace', 'testpoint', 'thermal', 'other'].includes(data.type) &&
    data.geometry &&
    ['rectangle', 'circle', 'polygon'].includes(data.geometry.type) &&
    Array.isArray(data.layers) &&
    data.layers.length > 0;
}

/**
 * 检查是否为有效的层数据
 */
export function isValidLayerData(data: any): data is LayerData {
  return data &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Object.values(LayerType).includes(data.type) &&
    typeof data.thickness === 'number' &&
    data.thickness > 0;
}

/**
 * 检查是否为有效的层叠结构数据
 */
export function isValidLayerStackupData(data: any): data is LayerStackupData {
  return data &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.layers) &&
    data.layers.length > 0 &&
    data.layers.every((layer: any) => 
      typeof layer.layerId === 'string' &&
      typeof layer.position === 'number' &&
      typeof layer.thickness === 'number' &&
      layer.thickness > 0
    );
}

// ============= 工具函数 =============

/**
 * 计算层叠结构的总厚度
 */
export function calculateStackupThickness(stackup: LayerStackupData): number {
  return stackup.layers.reduce((total, layer) => total + layer.thickness, 0);
}

/**
 * 获取层在层叠结构中的Z位置
 */
export function getLayerZPosition(stackup: LayerStackupData, layerId: string): number | undefined {
  let zPosition = 0;
  
  for (const layer of stackup.layers) {
    if (layer.layerId === layerId) {
      return zPosition + layer.thickness / 2; // 返回层中心的Z位置
    }
    zPosition += layer.thickness;
  }
  
  return undefined;
}

/**
 * 验证几何数据的完整性
 */
export function validateGeometry(geometry: GeometryData): boolean {
  switch (geometry.type) {
    case 'rectangle':
      return !!(geometry.center && 
        typeof geometry.width === 'number' && geometry.width > 0 &&
        typeof geometry.height === 'number' && geometry.height > 0);
    
    case 'circle':
      return !!(geometry.center && 
        typeof geometry.radius === 'number' && geometry.radius > 0);
    
    case 'polygon':
      return !!(geometry.points && 
        Array.isArray(geometry.points) && 
        geometry.points.length >= 3 &&
        geometry.points.every(p => 
          typeof p.x === 'number' && typeof p.y === 'number'
        ));
    
    default:
      return false;
  }
}

/**
 * 创建默认的层叠结构（4层板）
 */
export function createDefault4LayerStackup(): LayerStackupData {
  return {
    id: 'STACKUP_4L_DEFAULT',
    name: '4-Layer Standard',
    totalThickness: 1.6,
    description: 'Standard 4-layer PCB stackup',
    boardType: 'rigid',
    layers: [
      { layerId: 'L1_TOP', position: 1, thickness: 0.035, material: 'Copper' },
      { layerId: 'D1_PREPREG', position: 2, thickness: 0.2, material: 'FR4' },
      { layerId: 'L2_GND', position: 3, thickness: 0.035, material: 'Copper' },
      { layerId: 'CORE', position: 4, thickness: 1.065, material: 'FR4' },
      { layerId: 'L3_PWR', position: 5, thickness: 0.035, material: 'Copper' },
      { layerId: 'D2_PREPREG', position: 6, thickness: 0.2, material: 'FR4' },
      { layerId: 'L4_BOTTOM', position: 7, thickness: 0.035, material: 'Copper' }
    ],
    impedanceControl: {
      singleEnded: 50,
      differential: 100,
      tolerance: 10
    }
  };
}

// ============= IDX导出器专用接口 =============

/**
 * 浏览器导出结果接口
 * 
 * @remarks
 * 扩展基础导出结果，添加浏览器环境特有的属性
 * 支持直接下载和内容预览功能
 * 
 * @example
 * ```typescript
 * // TEST_CASE: Browser export result handling
 * // TEST_INPUT: Valid board data
 * // TEST_EXPECT: Returns BrowserExportResult with xmlContent and fileName
 * const result = await exporter.export(boardData);
 * assert(result.success === true);
 * assert(typeof result.xmlContent === 'string');
 * assert(result.fileName.endsWith('.idx'));
 * ```
 */
export interface BrowserExportResult {
  /** BUSINESS: 导出是否成功 */
  success: boolean;
  
  /** DESIGN: XML内容字符串，用于浏览器下载或预览 */
  xmlContent: string;
  
  /** DESIGN: 建议的文件名，包含时间戳和类型信息 */
  fileName: string;
  
  /** DESIGN: 导出文件信息列表，保持与服务端接口一致 */
  files: Array<{
    type: string;
    name: string;
    path: string;
    timestamp: string;
    designName: string;
    sequence: number;
  }>;
  
  /** PERFORMANCE: 导出统计信息，用于性能监控 */
  statistics: {
    totalItems: number;
    components: number;
    holes: number;
    keepouts: number;
    layers: number;
    fileSize: number;
    exportDuration: number;
  };
  
  /** BUSINESS: 导出过程中的问题和警告 */
  issues: Array<{
    type: 'error' | 'warning';
    code: string;
    message: string;
    itemId?: string;
  }>;
}

/**
 * XML注释配置接口
 * 
 * @remarks
 * 控制XML输出中注释的生成策略
 * 支持细粒度的注释控制，平衡可读性和文件大小
 * 
 * @example
 * ```typescript
 * // TEST_CASE: XML comment configuration
 * // TEST_INPUT: Full comment config
 * // TEST_EXPECT: All comment types enabled
 * const config: XMLCommentConfig = {
 *   enabled: true,
 *   includeFileHeader: true,
 *   includeItemComments: true,
 *   includeGeometryComments: true,
 *   includeSectionComments: true
 * };
 * ```
 */
export interface XMLCommentConfig {
  /** DESIGN: 是否启用注释生成，默认true */
  enabled?: boolean;
  
  /** DESIGN: 是否在文件头部添加详细注释，包含导出信息 */
  includeFileHeader?: boolean;
  
  /** DESIGN: 是否为每个项目添加注释，说明项目类型和属性 */
  includeItemComments?: boolean;
  
  /** DESIGN: 是否为几何元素添加注释，说明几何参数 */
  includeGeometryComments?: boolean;
  
  /** DESIGN: 是否为节区添加分隔注释，提高XML可读性 */
  includeSectionComments?: boolean;
}

