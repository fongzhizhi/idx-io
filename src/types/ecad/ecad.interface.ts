/** ECAD 系统数据 */
export interface ECADData {
  /** PCB板基本信息 */
  board: {
    outline: {
      points: {x: number, y: number}[];
      thickness: number;
      layers?: LayerDefinition[]; // 支持多层板
    };
    /** 板名称/ID */
    name: string;
    /** 单位 (mm/inch) */
    unit: 'mm' | 'inch' | 'mil';
  };
  
  /** 元件列表 */
  components: {
    id: string;
    refDes: string;        // 位号 R1, C2等
    package: string;       // 封装名 0402, SOIC-8等
    footprint?: string;    // 封装类型
    position: {x: number, y: number, rotation?: number};
    side: 'TOP' | 'BOTTOM';
    value?: string;        // 10k, 0.1uF等
    partNumber?: string;   // 料号
    /** 3D模型信息 */
    model3d?: {
      path: string;
      format: 'STEP' | 'STL' | 'IGES';
      transformation?: Matrix4x4;
    };
  }[];
  
  /** 钻孔列表 */
  holes: {
    id: string;
    x: number;
    y: number;
    diameter: number;
    type: 'PTH' | 'NPTH' | 'VIA';  // 电镀/非电镀/过孔
    /** 焊盘信息 */
    padstack?: string;
  }[];
  
  /** 禁布区/保持区 */
  keepouts: {
    type: 'ROUTE' | 'COMPONENT' | 'VIA';
    area: {x: number, y: number}[];
    height?: {min?: number, max?: number}; // Z轴范围
  }[];
  
  /** 走线信息（非协作，仅用于显示） */
  traces?: {
    layer: string;
    net: string;
    segments: {
      points: {x: number, y: number}[];
      width: number;
    }[];
  }[];
  
  /** 元数据 */
  metadata: {
    designName: string;
    revision: string;
    designer: string;
    company: string;
    createdDate: string;
  };
}

/** ECAD 板子 */
export interface ECADBoard {
	/** 板子轮廓 */
	outline: ;
}

/** 层定义（用于多层板） */
export interface LayerDefinition {
  name: string;
  type: 'SIGNAL' | 'POWER' | 'GROUND' | 'SOLDERMASK' | 'SILKSCREEN';
  material?: string;
  thickness: number;
  /** 层在堆叠中的顺序 */
  sequence: number;
}
