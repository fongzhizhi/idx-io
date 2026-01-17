/**
 * 命名空间管理器
 * 
 * 集中管理所有 IDX V4.5 XML 命名空间，确保命名空间使用的一致性和正确性
 * 
 * @remarks
 * 根据 IDX V4.5 协议规范，不同类型的元素应该使用特定的命名空间前缀
 */
export class NamespaceManager {
  /**
   * 标准命名空间定义
   * 
   * 这些命名空间是 IDX V4.5 协议规范中定义的标准命名空间
   */
  private static readonly NAMESPACES: Record<string, string> = {
    foundation: 'http://www.prostep.org/EDMD/Foundation',
    pdm: 'http://www.prostep.org/EDMD/PDM',
    d2: 'http://www.prostep.org/EDMD/2D',
    d3: 'http://www.prostep.org/EDMD/3D',
    property: 'http://www.prostep.org/EDMD/Property',
    computational: 'http://www.prostep.org/EDMD/Computational',
    administration: 'http://www.prostep.org/EDMD/Administration',
    xsi: 'http://www.w3.org/2001/XMLSchema-instance'
  };

  /**
   * 类型到命名空间的映射
   * 
   * 定义了各种 IDX 元素类型应该使用的命名空间前缀
   */
  private static readonly TYPE_TO_NAMESPACE: Record<string, string> = {
    // ProcessInstruction 类型（使用 computational 命名空间）
    'EDMDProcessInstructionSendInformation': 'computational',
    'EDMDProcessInstructionSendChanges': 'computational',
    'EDMDProcessInstructionRequestForInformation': 'computational',
    
    // 基础对象类型（使用 foundation 命名空间）
    'EDMDHeader': 'foundation',
    'EDMDDataSetBody': 'foundation',
    'EDMDItem': 'foundation',
    'EDMDIdentifier': 'foundation',
    'EDMDName': 'foundation',
    
    // 几何元素（使用 d2 或 d3 命名空间）
    'EDMDCartesianPoint': 'd2',
    'EDMDCurveSet2d': 'd2',
    'EDMDPolyLine': 'd2',
    'EDMDCircleCenter': 'd2',
    'EDMDLine': 'd2',
    'EDMDArc': 'd2',
    
    // PDM 类型（使用 pdm 命名空间）
    'EDMDTransformation': 'pdm',
    'EDMDItemInstance': 'pdm',
    
    // 用户属性（使用 property 命名空间）
    'EDMDUserSimpleProperty': 'property',
  };

  /**
   * 元素名称到命名空间的映射
   * 
   * 定义了各种 XML 元素应该使用的命名空间前缀
   */
  private static readonly ELEMENT_TO_NAMESPACE: Record<string, string> = {
    // 基础元素
    'Item': 'foundation',
    'Header': 'foundation',
    'Body': 'foundation',
    'ProcessInstruction': 'foundation',
    'CartesianPoint': 'foundation',
    'PolyLine': 'foundation',
    'CircleCenter': 'foundation',
    'CurveSet2d': 'foundation',
    'ShapeElement': 'foundation',
    
    // PDM 元素
    'ItemType': 'pdm',
    'ItemInstance': 'pdm',
    'Identifier': 'pdm',
    'Shape': 'pdm',
    'BaseLine': 'pdm',
    'AssembleToName': 'pdm',
    'Transformation': 'pdm',
    'PackageName': 'pdm',
    'ShapeDescriptionType': 'pdm',
    'ShapeElementType': 'pdm',
    'Inverted': 'pdm',
    'DefiningShape': 'pdm',
    
    // 2D 几何元素
    'X': 'd2',
    'Y': 'd2',
    'Point': 'd2',
    'CenterPoint': 'd2',
    'Diameter': 'd2',
    'LowerBound': 'd2',
    'UpperBound': 'd2',
    'DetailedGeometricModelElement': 'd2',
    
    // 变换矩阵元素
    'xx': 'd2',
    'xy': 'd2',
    'yx': 'd2',
    'yy': 'd2',
    'tx': 'd2',
    'ty': 'd2',
    'zOffset': 'd2',
    
    // 属性元素
    'UserProperty': 'foundation',  // 根据IDX v4.5规范，UserProperty使用foundation命名空间
    'UserSimpleProperty': 'property',
    'Key': 'property',
    'Value': 'property',
    
    // Foundation 元素
    'SystemScope': 'foundation',
    'ObjectName': 'foundation',
    'Number': 'foundation',
    'Version': 'foundation',
    'Revision': 'foundation',
    'Sequence': 'foundation',
    'Name': 'foundation',
    'Description': 'foundation',
    'CreatorName': 'foundation',
    'CreatorCompany': 'foundation',
    'CreatorSystem': 'foundation',
    'GlobalUnitLength': 'foundation',
    'CreationDateTime': 'foundation',
    'ModifiedDateTime': 'foundation',
    'InstructionType': 'foundation',
  };

  /**
   * 获取所有命名空间声明
   * 
   * @returns 包含所有命名空间声明的对象，键为 xmlns:prefix，值为命名空间 URI
   * 
   * @example
   * ```typescript
   * const namespaces = NamespaceManager.getAllNamespaces();
   * // 返回:
   * // {
   * //   'xmlns:foundation': 'http://www.prostep.org/EDMD/Foundation',
   * //   'xmlns:pdm': 'http://www.prostep.org/EDMD/PDM',
   * //   ...
   * // }
   * ```
   */
  static getAllNamespaces(): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [prefix, uri] of Object.entries(this.NAMESPACES)) {
      if (prefix === 'xsi') {
        result[`xmlns:${prefix}`] = uri;
      } else {
        result[`xmlns:${prefix}`] = uri;
      }
    }
    
    // 添加 schemaLocation
    result['xsi:schemaLocation'] = 'http://www.prostep.org/EDMD/Foundation ../schemas/EDMDSchema.foundation.xsd';
    
    return result;
  }

  /**
   * 获取类型对应的命名空间前缀
   * 
   * @param typeName - 类型名称（如 'EDMDProcessInstructionSendInformation'）
   * @returns 命名空间前缀（如 'computational'），如果未找到则返回 'foundation'
   * 
   * @example
   * ```typescript
   * const namespace = NamespaceManager.getNamespaceForType('EDMDProcessInstructionSendInformation');
   * // 返回: 'computational'
   * ```
   */
  static getNamespaceForType(typeName: string): string {
    return this.TYPE_TO_NAMESPACE[typeName] || 'foundation';
  }

  /**
   * 获取元素对应的命名空间前缀
   * 
   * @param elementName - 元素名称（如 'ProcessInstruction'）
   * @returns 命名空间前缀（如 'foundation'），如果未找到则返回 'foundation'
   * 
   * @example
   * ```typescript
   * const namespace = NamespaceManager.getNamespaceForElement('ProcessInstruction');
   * // 返回: 'foundation'
   * ```
   */
  static getNamespaceForElement(elementName: string): string {
    return this.ELEMENT_TO_NAMESPACE[elementName] || 'foundation';
  }

  /**
   * 获取完整的类型声明（包含命名空间前缀）
   * 
   * @param typeName - 类型名称（如 'EDMDProcessInstructionSendInformation'）
   * @returns 完整的类型声明（如 'computational:EDMDProcessInstructionSendInformation'）
   * 
   * @example
   * ```typescript
   * const fullType = NamespaceManager.getFullTypeName('EDMDProcessInstructionSendInformation');
   * // 返回: 'computational:EDMDProcessInstructionSendInformation'
   * ```
   */
  static getFullTypeName(typeName: string): string {
    const namespace = this.getNamespaceForType(typeName);
    return `${namespace}:${typeName}`;
  }

  /**
   * 获取完整的元素名称（包含命名空间前缀）
   * 
   * @param elementName - 元素名称（如 'ProcessInstruction'）
   * @returns 完整的元素名称（如 'foundation:ProcessInstruction'）
   * 
   * @example
   * ```typescript
   * const fullElement = NamespaceManager.getFullElementName('ProcessInstruction');
   * // 返回: 'foundation:ProcessInstruction'
   * ```
   */
  static getFullElementName(elementName: string): string {
    const namespace = this.getNamespaceForElement(elementName);
    return `${namespace}:${elementName}`;
  }

  /**
   * 验证命名空间使用是否正确
   * 
   * @param elementName - 元素名称
   * @param namespace - 使用的命名空间前缀
   * @returns 如果命名空间使用正确则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * const isValid = NamespaceManager.validateNamespaceUsage('ProcessInstruction', 'foundation');
   * // 返回: true
   * 
   * const isInvalid = NamespaceManager.validateNamespaceUsage('ProcessInstruction', 'pdm');
   * // 返回: false
   * ```
   */
  static validateNamespaceUsage(elementName: string, namespace: string): boolean {
    const expectedNamespace = this.getNamespaceForElement(elementName);
    return expectedNamespace === namespace;
  }

  /**
   * 获取命名空间 URI
   * 
   * @param prefix - 命名空间前缀（如 'foundation'）
   * @returns 命名空间 URI（如 'http://www.prostep.org/EDMD/Foundation'）
   * 
   * @example
   * ```typescript
   * const uri = NamespaceManager.getNamespaceURI('foundation');
   * // 返回: 'http://www.prostep.org/EDMD/Foundation'
   * ```
   */
  static getNamespaceURI(prefix: string): string | undefined {
    return this.NAMESPACES[prefix];
  }

  /**
   * 检查命名空间前缀是否有效
   * 
   * @param prefix - 命名空间前缀
   * @returns 如果前缀有效则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * const isValid = NamespaceManager.isValidPrefix('foundation');
   * // 返回: true
   * 
   * const isInvalid = NamespaceManager.isValidPrefix('invalid');
   * // 返回: false
   * ```
   */
  static isValidPrefix(prefix: string): boolean {
    return prefix in this.NAMESPACES;
  }
}
