import { EDMDDataSet, EDMDItem, ItemType } from "../../types/core";

/**
 * XML注释生成器
 * 负责为IDX文件的各个部分生成描述性注释，提高文件的可读性和调试体验
 */
export class CommentGenerator {
  
  /**
   * 生成文件头部注释
   * 包含生成信息、版本、时间戳等
   */
  generateFileHeader(dataset: EDMDDataSet): string {
    const timestamp = new Date().toISOString();
    const itemCount = dataset.Body.Items.length;
    const geometricElementCount = dataset.Body.GeometricElements?.length || 0;
    const curveSetCount = dataset.Body.CurveSet2Ds?.length || 0;
    
    const comments = [
      '='.repeat(80),
      'IDX导出文件 - 增强注释版本',
      '='.repeat(80),
      `生成时间: ${timestamp}`,
      `创建系统: ${dataset.Header.CreatorSystem || '未知'}`,
      `创建公司: ${dataset.Header.CreatorCompany || '未知'}`,
      `格式: IDX v4.5 简化几何表示`,
      '',
      '内容摘要:',
      `- 总项目数: ${itemCount}`,
      `- 几何元素: ${geometricElementCount}`,
      `- 2D曲线集: ${curveSetCount}`,
      '',
      '此文件包含用于制造和装配流程的PCB设计数据',
      '所有坐标单位为毫米',
      '='.repeat(80)
    ];
    
    return comments.join('\n');
  }
  
  /**
   * 生成数据集注释
   * 描述整个数据集的内容概览
   */
  generateDatasetComment(dataset: EDMDDataSet): string {
    const itemCount = dataset.Body.Items.length;
    const hasGeometry = (dataset.Body.GeometricElements?.length || 0) > 0;
    const hasCurves = (dataset.Body.CurveSet2Ds?.length || 0) > 0;
    
    const features = [];
    if (hasGeometry) features.push('几何元素');
    if (hasCurves) features.push('2D曲线');
    if (itemCount > 0) features.push(`${itemCount} 个设计项目`);
    
    return `数据集包含 ${features.join(', ')}`;
  }
  
  /**
   * 生成项目注释
   * 为每个EDMDItem生成描述性注释
   */
  generateItemComment(item: EDMDItem): string {
    const parts = [`项目: ${item.Name || item.id}`];
    
    // 添加项目类型信息
    if (item.ItemType) {
      parts.push(`类型: ${item.ItemType}`);
    }
    
    // 添加几何类型信息
    if (item.geometryType) {
      parts.push(`几何: ${item.geometryType}`);
    }
    
    // 添加描述信息
    if (item.Description) {
      parts.push(`描述: ${item.Description}`);
    }
    
    // 添加包名信息
    if (item.PackageName) {
      parts.push(`封装: ${item.PackageName.ObjectName}`);
    }
    
    // 添加用户属性数量
    if (item.UserProperties && item.UserProperties.length > 0) {
      parts.push(`属性: ${item.UserProperties.length}`);
    }
    
    return parts.join(' | ');
  }
  
  /**
   * 生成几何元素注释
   * 为几何元素生成描述性注释
   */
  generateGeometricElementComment(element: any): string {
    if (element['xsi:type'] === 'd2:EDMDCartesianPoint') {
      const x = element.X?.['property:Value'] || '未知';
      const y = element.Y?.['property:Value'] || '未知';
      return `笛卡尔坐标点 位置 (${x}, ${y}) mm`;
    } 
    
    if (element.type === 'PolyLine') {
      const pointCount = element.Point?.length || 0;
      return `多段线 包含 ${pointCount} 个点定义路径`;
    } 
    
    if (element.type === 'CircleCenter') {
      const diameter = element.Diameter?.['property:Value'] || '未知';
      const centerPoint = element.CenterPoint || '未知';
      return `圆形 直径 ${diameter} mm，圆心在点 ${centerPoint}`;
    }
    
    return `几何元素: ${element.type || element['xsi:type'] || '未知类型'}`;
  }
  
  /**
   * 生成曲线集注释
   * 为2D曲线集生成描述性注释
   */
  generateCurveSetComment(curveSet: any): string {
    const lowerBound = curveSet['d2:LowerBound']?.['property:Value'] || '未知';
    const upperBound = curveSet['d2:UpperBound']?.['property:Value'] || '未知';
    const shapeType = curveSet['pdm:ShapeDescriptionType'] || '未知';
    
    return `2.5D曲线集 (${shapeType}): Z范围 [${lowerBound}, ${upperBound}] mm`;
  }
  
  /**
   * 生成组件相关注释
   * 为组件数据生成专门的注释
   */
  generateComponentComment(item: EDMDItem): string {
    if (item.ItemType !== ItemType.SINGLE) {
      return this.generateItemComment(item);
    }
    
    const parts = [`组件: ${item.Name || item.id}`];
    
    // 添加包名信息
    if (item.PackageName) {
      parts.push(`封装: ${item.PackageName.ObjectName}`);
    }
    
    // 从用户属性中提取组件特定信息
    if (item.UserProperties) {
      const refDes = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'RefDes' || p.Key?.ObjectName === 'ReferenceDesignator'
      );
      if (refDes) {
        parts.push(`位号: ${refDes.Value}`);
      }
      
      const partNumber = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'PartNumber'
      );
      if (partNumber) {
        parts.push(`料号: ${partNumber.Value}`);
      }
    }
    
    return parts.join(' | ');
  }
  
  /**
   * 生成层相关注释
   * 为层数据生成专门的注释
   */
  generateLayerComment(item: EDMDItem): string {
    const parts = [`层: ${item.Name || item.id}`];
    
    // 从用户属性中提取层特定信息
    if (item.UserProperties) {
      const layerType = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'LayerType'
      );
      if (layerType) {
        parts.push(`类型: ${layerType.Value}`);
      }
      
      const thickness = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'Thickness'
      );
      if (thickness) {
        parts.push(`厚度: ${thickness.Value} mm`);
      }
      
      const material = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'Material'
      );
      if (material) {
        parts.push(`材料: ${material.Value}`);
      }
    }
    
    return parts.join(' | ');
  }
  
  /**
   * 生成孔相关注释
   * 为孔数据生成专门的注释
   */
  generateHoleComment(item: EDMDItem): string {
    const parts = [`孔: ${item.Name || item.id}`];
    
    // 从用户属性中提取孔特定信息
    if (item.UserProperties) {
      const holeType = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'HoleType'
      );
      if (holeType) {
        parts.push(`类型: ${holeType.Value}`);
      }
      
      const diameter = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'Diameter'
      );
      if (diameter) {
        parts.push(`直径: ${diameter.Value} mm`);
      }
      
      const plated = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'Plated'
      );
      if (plated) {
        parts.push(`镀层: ${plated.Value}`);
      }
    }
    
    return parts.join(' | ');
  }
  
  /**
   * 生成禁止区注释
   * 为禁止区数据生成专门的注释
   */
  generateKeepoutComment(item: EDMDItem): string {
    const parts = [`禁止区: ${item.Name || item.id}`];
    
    // 从用户属性中提取禁止区特定信息
    if (item.UserProperties) {
      const keepoutType = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'KeepoutType'
      );
      if (keepoutType) {
        parts.push(`类型: ${keepoutType.Value}`);
      }
      
      const layers = item.UserProperties.find(p => 
        p.Key?.ObjectName === 'Layers'
      );
      if (layers) {
        parts.push(`层: ${layers.Value}`);
      }
    }
    
    return parts.join(' | ');
  }
  
  /**
   * 生成形状元素注释
   * 为形状元素生成描述性注释
   */
  generateShapeElementComment(shapeElement: any): string {
    const elementType = shapeElement['pdm:ShapeElementType'] || '未知';
    const isInverted = shapeElement['pdm:Inverted'] === 'true';
    const definingShape = shapeElement['pdm:DefiningShape'] || '未知';
    
    const parts = [`形状元素: ${elementType}`];
    if (isInverted) parts.push('(反转)');
    parts.push(`由 ${definingShape} 定义`);
    
    return parts.join(' ');
  }
  
  /**
   * 生成用户属性注释
   * 为用户属性组生成描述性注释
   */
  generateUserPropertiesComment(properties: any[]): string {
    if (!properties || properties.length === 0) {
      return '未定义自定义属性';
    }
    
    const propertyNames = properties.map(p => 
      p.Key?.ObjectName || '未知'
    ).join(', ');
    
    return `自定义属性 (${properties.length}): ${propertyNames}`;
  }
  
  /**
   * 生成变换矩阵注释
   * 为变换矩阵生成描述性注释
   */
  generateTransformationComment(transformation: any): string {
    const type = transformation.TransformationType || '未知';
    
    if (type === 'd2') {
      const tx = transformation.tx?.Value || 0;
      const ty = transformation.ty?.Value || 0;
      const rotation = this.calculateRotationAngle(transformation);
      
      const parts = [`2D变换: 平移(${tx}, ${ty}) mm`];
      if (rotation !== 0) {
        parts.push(`旋转(${rotation.toFixed(1)}°)`);
      }
      
      return parts.join(', ');
    }
    
    return `变换: ${type}`;
  }
  
  /**
   * 从变换矩阵计算旋转角度
   */
  private calculateRotationAngle(transformation: any): number {
    const xx = parseFloat(transformation.xx) || 1;
    const xy = parseFloat(transformation.xy) || 0;
    
    // 计算旋转角度（弧度转度数）
    const angleRad = Math.atan2(xy, xx);
    const angleDeg = angleRad * (180 / Math.PI);
    
    return angleDeg;
  }
  
  /**
   * 生成节区分隔注释
   * 为XML的主要节区生成分隔注释
   */
  generateSectionComment(sectionName: string, itemCount?: number): string {
    const countInfo = itemCount !== undefined ? ` (${itemCount} items)` : '';
    return `${sectionName.toUpperCase()} SECTION${countInfo}`;
  }
  
  /**
   * 生成处理指令注释
   * 为处理指令生成描述性注释
   */
  generateProcessInstructionComment(instruction: any): string {
    const type = instruction.instructionType || '未知';
    const id = instruction.id || '未知';
    
    return `处理指令: ${type} (ID: ${id}) - 定义如何处理此数据`;
  }
}