/**
 * 几何类型映射器
 * 
 * 将内部几何类型映射到 IDX V4.5 标准几何类型
 * 
 * @remarks
 * 根据 IDX V4.5 协议表 8（第 52 页），定义了标准的几何类型值
 */
export class GeometryTypeMapper {
  /**
   * 标准几何类型（来自 IDX V4.5 协议表 8）
   * 
   * 这些是 IDX 协议中定义的标准 geometryType 属性值
   */
  private static readonly STANDARD_GEOMETRY_TYPES = [
    // 板相关
    'BOARD_OUTLINE',
    'BOARD_AREA',
    
    // 组件相关
    'COMPONENT',
    'COMPONENT_MECHANICAL',
    
    // 孔相关 - 根据协议专家反馈修正
    'VIA',              // 普通过孔
    'FILLED_VIA',       // 填充过孔
    'HOLE_PLATED',      // 镀孔（非过孔）
    'HOLE_NON_PLATED',  // 非镀孔
    
    // 禁止区相关
    'KEEPOUT_AREA_COMPONENT',
    'KEEPOUT_AREA_ROUTE',
    'KEEPOUT_AREA_VIA',
    'KEEPOUT_AREA_TESTPOINT',
    
    // 层相关
    'LAYER',
    'LAYER_GENERIC',
    'LAYER_SOLDERMASK',
    'LAYER_SILKSCREEN',
    'LAYER_OTHERSIGNAL',
    'LAYER_STACKUP',
    
    // 其他
    'FIDUCIAL',
    'TESTPOINT',
    'MOUNTING_HOLE',
  ] as const;

  /**
   * 内部类型到 IDX 类型的映射
   * 
   * 定义了如何将内部使用的类型名称映射到 IDX 标准类型
   */
  private static readonly TYPE_MAPPING: Record<string, string> = {
    // 过孔类型映射 - 根据协议专家反馈修正
    'VIA': 'VIA',              // 过孔使用 VIA 类型
    'via': 'VIA',
    'through': 'VIA',          // 通孔过孔
    'blind': 'VIA',            // 盲孔过孔
    'buried': 'VIA',           // 埋孔过孔
    'micro': 'VIA',            // 微孔过孔
    'filled': 'FILLED_VIA',    // 填充过孔
    'filled-via': 'FILLED_VIA',
    
    // 非过孔的镀孔和非镀孔
    'plated': 'HOLE_PLATED',      // 镀孔（非过孔，如测试孔）
    'plated-hole': 'HOLE_PLATED',
    'non-plated': 'HOLE_NON_PLATED',
    'non-plated-hole': 'HOLE_NON_PLATED',
    'mounting': 'HOLE_NON_PLATED',     // 安装孔通常是非镀孔
    'mounting-hole': 'HOLE_NON_PLATED',
    
    // 组件类型映射
    'component': 'COMPONENT',
    'mechanical': 'COMPONENT_MECHANICAL',
    'mechanical-component': 'COMPONENT_MECHANICAL',
    
    // 禁止区类型映射
    'keepout': 'KEEPOUT_AREA_COMPONENT',
    'keepout-component': 'KEEPOUT_AREA_COMPONENT',
    'keepout-route': 'KEEPOUT_AREA_ROUTE',
    'keepout-via': 'KEEPOUT_AREA_VIA',
    'keepout-testpoint': 'KEEPOUT_AREA_TESTPOINT',
    
    // 层类型映射
    'layer': 'LAYER',
    'signal': 'LAYER_OTHERSIGNAL',
    'plane': 'LAYER_OTHERSIGNAL',
    'soldermask': 'LAYER_SOLDERMASK',
    'silkscreen': 'LAYER_SILKSCREEN',
    'dielectric': 'LAYER_GENERIC',
    
    // 板类型映射
    'board': 'BOARD_OUTLINE',
    'board-outline': 'BOARD_OUTLINE',
    'board-area': 'BOARD_AREA',
    
    // 其他类型映射
    'fiducial': 'FIDUCIAL',
    'testpoint': 'TESTPOINT',
    'test-point': 'TESTPOINT',
  };

  /**
   * 将内部类型映射到 IDX 标准类型
   * 
   * @param internalType - 内部使用的类型名称
   * @param context - 可选的上下文信息，用于更精确的映射
   * @returns IDX 标准类型，如果无法映射则返回 null
   * 
   * @example
   * ```typescript
   * const idxType = GeometryTypeMapper.mapToIDXType('VIA');
   * // 返回: 'HOLE_PLATED'
   * 
   * const idxType2 = GeometryTypeMapper.mapToIDXType('non-plated');
   * // 返回: 'HOLE_NON_PLATED'
   * ```
   */
  static mapToIDXType(internalType: string, context?: {
    viaType?: 'plated' | 'non-plated' | 'filled' | 'micro';
    purpose?: string;
    isMechanical?: boolean;
  }): string | null {
    // 如果已经是标准类型，直接返回
    if (this.isValidGeometryType(internalType)) {
      return internalType;
    }
    
    // 转换为小写进行匹配
    const lowerType = internalType.toLowerCase();
    
    // 使用上下文信息进行更精确的映射
    if (context) {
      // 过孔类型的特殊处理
      if (lowerType === 'via' || lowerType === 'hole') {
        if (context.viaType === 'filled') {
          return 'FILLED_VIA';
        } else if (context.viaType === 'non-plated') {
          return 'HOLE_NON_PLATED';
        } else if (context.purpose === 'mounting') {
          return 'MOUNTING_HOLE';
        } else {
          return 'HOLE_PLATED';
        }
      }
      
      // 组件类型的特殊处理
      if (lowerType === 'component' && context.isMechanical) {
        return 'COMPONENT_MECHANICAL';
      }
    }
    
    // 使用映射表
    const mappedType = this.TYPE_MAPPING[lowerType];
    if (mappedType) {
      return mappedType;
    }
    
    // 无法映射
    return null;
  }

  /**
   * 判断是否应使用简化表示
   * 
   * @param type - 几何类型
   * @returns 如果应该使用简化表示则返回 true
   * 
   * @remarks
   * IDX V4.5 支持简化表示（使用 geometryType 属性）和传统表示
   * 大多数情况下应该使用简化表示
   */
  static shouldUseSimplifiedRepresentation(type: string): boolean {
    // 所有标准类型都支持简化表示
    return this.isValidGeometryType(type);
  }

  /**
   * 验证几何类型是否有效
   * 
   * @param type - 几何类型
   * @returns 如果类型有效则返回 true
   * 
   * @example
   * ```typescript
   * const isValid = GeometryTypeMapper.isValidGeometryType('HOLE_PLATED');
   * // 返回: true
   * 
   * const isInvalid = GeometryTypeMapper.isValidGeometryType('VIA');
   * // 返回: false
   * ```
   */
  static isValidGeometryType(type: string): boolean {
    return this.STANDARD_GEOMETRY_TYPES.includes(type as any);
  }

  /**
   * 获取所有标准几何类型
   * 
   * @returns 标准几何类型数组
   */
  static getAllStandardTypes(): readonly string[] {
    return this.STANDARD_GEOMETRY_TYPES;
  }

  /**
   * 根据孔的属性推断几何类型
   * 
   * @param holeData - 孔的数据
   * @returns 推断的几何类型
   * 
   * @example
   * ```typescript
   * const type = GeometryTypeMapper.inferHoleType({
   *   type: 'plated',
   *   purpose: 'via'
   * });
   * // 返回: 'VIA'
   * ```
   */
  static inferHoleType(holeData: {
    type?: 'plated' | 'non-plated' | 'filled' | 'micro';
    viaType?: 'plated' | 'non-plated' | 'filled' | 'micro' | 'through' | 'blind' | 'buried';
    purpose?: 'via' | 'mounting' | 'testpoint' | string;
    netName?: string;
  }): string {
    // 根据 purpose 判断
    if (holeData.purpose === 'mounting') {
      return 'HOLE_NON_PLATED';  // 安装孔通常是非镀孔
    }
    
    if (holeData.purpose === 'testpoint') {
      return 'TESTPOINT';
    }
    
    // 如果明确标识为过孔用途，使用 VIA 类型
    if (holeData.purpose === 'via') {
      if (holeData.type === 'filled' || holeData.viaType === 'filled') {
        return 'FILLED_VIA';
      }
      return 'VIA';
    }
    
    // 根据 type 或 viaType 判断
    const holeType = holeData.type || holeData.viaType;
    
    if (holeType === 'filled') {
      return 'FILLED_VIA';
    }
    
    // 过孔相关类型都使用 VIA
    if (holeType === 'through' || holeType === 'blind' || holeType === 'buried' || holeType === 'micro') {
      return 'VIA';
    }
    
    if (holeType === 'non-plated') {
      return 'HOLE_NON_PLATED';
    }
    
    // 如果有网络名称，很可能是过孔
    if (holeData.netName) {
      return 'VIA';
    }
    
    // 默认：镀孔但不是过孔（如测试孔）
    return 'HOLE_PLATED';
  }

  /**
   * 根据禁止区的属性推断几何类型
   * 
   * @param keepoutData - 禁止区的数据
   * @returns 推断的几何类型
   * 
   * @example
   * ```typescript
   * const type = GeometryTypeMapper.inferKeepoutType({
   *   type: 'component'
   * });
   * // 返回: 'KEEPOUT_AREA_COMPONENT'
   * ```
   */
  static inferKeepoutType(keepoutData: {
    type?: 'component' | 'route' | 'via' | 'testpoint' | 'trace' | string;
    constraintType?: 'route' | 'component' | 'via' | 'testpoint' | string;
    purpose?: string;
  }): string {
    const keepoutType = keepoutData.type || keepoutData.constraintType;
    
    if (keepoutType === 'component') {
      return 'KEEPOUT_AREA_COMPONENT';
    }
    
    if (keepoutType === 'route' || keepoutType === 'trace') {
      return 'KEEPOUT_AREA_ROUTE';
    }
    
    if (keepoutType === 'via') {
      return 'KEEPOUT_AREA_VIA';
    }
    
    if (keepoutType === 'testpoint') {
      return 'KEEPOUT_AREA_TESTPOINT';
    }
    
    // 默认为组件禁止区
    return 'KEEPOUT_AREA_COMPONENT';
  }

  /**
   * 根据层的属性推断几何类型
   * 
   * @param layerData - 层的数据
   * @returns 推断的几何类型
   * 
   * @example
   * ```typescript
   * const type = GeometryTypeMapper.inferLayerType({
   *   type: 'SOLDERMASK'
   * });
   * // 返回: 'LAYER_SOLDERMASK'
   * ```
   */
  static inferLayerType(layerData: {
    type?: 'SIGNAL' | 'PLANE' | 'SOLDERMASK' | 'SILKSCREEN' | 'DIELECTRIC' | 'OTHERSIGNAL' | string;
    purpose?: string;
  }): string {
    const layerType = layerData.type?.toUpperCase();
    
    if (layerType === 'SOLDERMASK') {
      return 'LAYER_SOLDERMASK';
    }
    
    if (layerType === 'SILKSCREEN') {
      return 'LAYER_SILKSCREEN';
    }
    
    if (layerType === 'SIGNAL' || layerType === 'PLANE' || layerType === 'OTHERSIGNAL') {
      return 'LAYER_OTHERSIGNAL';
    }
    
    if (layerType === 'DIELECTRIC') {
      return 'LAYER_GENERIC';
    }
    
    // 默认为通用层
    return 'LAYER';
  }
}
