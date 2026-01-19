/**
 * 工具函数
 */

import type { IdxData } from '../types'

/**
 * 验证IDX数据格式
 * @param data - 要验证的数据
 * @returns 是否有效
 */
export function validateIdxData(data: unknown): data is IdxData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const obj = data as Record<string, unknown>

  return (
    typeof obj.version === 'string' &&
    typeof obj.content === 'object' &&
    obj.content !== null
  )
}

/**
 * 创建默认的IDX数据结构
 * @param content - 数据内容
 * @returns IDX数据对象
 */
export function createIdxData(content: Record<string, unknown>): IdxData {
  return {
    version: '1.0.0',
    content,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}
