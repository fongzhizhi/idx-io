// ============= 消息工具函数 =============
// DESIGN: 提供IDX消息类型判断的工具函数
// BUSINESS: 支持不同类型IDX消息的识别和处理

import { 
  IDXMessage, 
  SendInformationMessage, 
  SendChangesMessage, 
  RequestForInformationMessage 
} from '../types/core/messages';

/**
 * 检查是否为发送信息消息
 * 用于在运行时判断消息类型
 */
export function isSendInformationMessage(msg: IDXMessage): msg is SendInformationMessage {
  return msg.ProcessInstruction.instructionType === 'SendInformation';
}

/**
 * 检查是否为发送变更消息
 */
export function isSendChangesMessage(msg: IDXMessage): msg is SendChangesMessage {
  return msg.ProcessInstruction.instructionType === 'SendChanges';
}

/**
 * 检查是否为请求信息消息
 */
export function isRequestForInformationMessage(msg: IDXMessage): msg is RequestForInformationMessage {
  return msg.ProcessInstruction.instructionType === 'RequestForInformation';
}