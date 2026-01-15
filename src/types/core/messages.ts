// ============= IDX消息类型 =============
// DESIGN: IDX协议支持三种消息类型，所有消息都基于EDMDDataSet
// REF: Section 3, 5.1-5.5

import { EDMDHeader, GlobalUnit } from './common';
import { EDMDDataSetBody } from './items';

// ------------ 过程指令 ------------
/**
 * 过程指令基类
 */
export interface EDMDProcessInstruction {
  id: string;
  instructionType: string;
}

/**
 * 发送信息指令
 */
export interface EDMDProcessInstructionSendInformation extends EDMDProcessInstruction {
  instructionType: 'SendInformation';
}

/**
 * 发送变更指令
 */
export interface EDMDProcessInstructionSendChanges extends EDMDProcessInstruction {
  instructionType: 'SendChanges';
  Actor?: string;
  Changes?: any[];
  ClearanceState?: boolean;
}

// ------------ 完整数据集 ------------
/**
 * EDMD数据集 - IDX消息的根容器
 */
export interface EDMDDataSet {
  /** 数据集头部信息 */
  Header: EDMDHeader;
  
  /** 数据集体（几何和项目数据） */
  Body: EDMDDataSetBody;
  
  /** 过程指令（定义消息类型） */
  ProcessInstruction: EDMDProcessInstruction;
  
  /** 可选的交易历史 */
  History?: any[];
  
  /** 可选的XML命名空间声明 */
  namespaces?: Record<string, string>;
}

// ------------ 消息类型别名 ------------
/**
 * 发送信息消息（基线消息）
 */
export type SendInformationMessage = EDMDDataSet & {
  ProcessInstruction: EDMDProcessInstructionSendInformation;
};

/**
 * 发送变更消息
 */
export type SendChangesMessage = EDMDDataSet & {
  ProcessInstruction: EDMDProcessInstructionSendChanges;
};

// ------------ 文件相关类型 ------------
/**
 * IDX文件类型
 */
export enum IDXFileType {
  BASELINE = 'baseline',
  CHANGE = 'change',
  RESPONSE = 'response',
  CLEARANCE = 'clearance'
}

/**
 * IDX文件元数据
 */
export interface IDXFileMetadata {
  type: IDXFileType;
  name: string;
  path: string;
  timestamp: string;
  designName: string;
  sequence: number;
}

/**
 * IDX导出配置
 */
export interface IDXExportConfig {
  output: {
    directory: string;
    designName: string;
    compress: boolean;
    namingPattern: string;
  };
  
  protocolVersion: '4.0' | '4.5';
  
  geometry: {
    useSimplified: boolean;
    defaultUnit: GlobalUnit;
    precision: number;
  };
  
  collaboration: {
    creatorSystem: string;
    creatorCompany: string;
    includeNonCollaborative: boolean;
    includeLayerStackup: boolean;
  };
}

/**
 * IDX导出结果
 */
export interface ExportResult {
  success: boolean;
  files: IDXFileMetadata[];
  statistics: {
    totalItems: number;
    components: number;
    holes: number;
    keepouts: number;
    layers: number;
    fileSize: number;
    exportDuration: number;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    itemId?: string;
  }>;
}
