import { create } from "xmlbuilder2";
import { EDMDDataSet, EDMDHeader, EDMDDataSetBody, EDMDItem, ItemType, EDMDIdentifier, EDMDProcessInstruction } from "../../types/core";
import { TransformationBuilder } from "../builders/transformation-builder";
import { ComponentStructureBuilder, ComponentData } from "../builders/component-structure-builder";

/**
 * XML写入器选项
 */
export interface XMLWriterOptions {
  /** 是否格式化输出 */
  prettyPrint?: boolean;
  
  /** 字符编码 */
  encoding?: string;
  
  /** 数值精度（小数位数），默认为6 */
  numericPrecision?: number;
  
  /** 是否移除尾随零，默认为true */
  removeTrailingZeros?: boolean;
}

/**
 * 数值格式化配置
 */
interface NumericFormatConfig {
  precision: number;
  removeTrailingZeros: boolean;
}

// src/exporter/writers/xml-writer.ts
export class XMLWriter {
  private namespaces: Record<string, string>;
  private prettyPrint: boolean;
  private encoding: string;
  private numericFormat: NumericFormatConfig;
  protected transformationBuilder: TransformationBuilder;
  protected componentStructureBuilder: ComponentStructureBuilder;

  constructor(options: XMLWriterOptions = {}) {
    this.namespaces = {
      'xmlns:foundation': 'http://www.prostep.org/EDMD/Foundation',
      'xmlns:pdm': 'http://www.prostep.org/EDMD/PDM',
      'xmlns:d2': 'http://www.prostep.org/EDMD/2D',
      'xmlns:property': 'http://www.prostep.org/EDMD/Property',
      'xmlns:computational': 'http://www.prostep.org/EDMD/Computational',
      'xmlns:administration': 'http://www.prostep.org/EDMD/Administration',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.prostep.org/EDMD/Foundation ../schemas/EDMDSchema.foundation.xsd'
    };
    
    this.prettyPrint = options.prettyPrint ?? true;
    this.encoding = options.encoding ?? 'UTF-8';
    this.numericFormat = {
      precision: options.numericPrecision ?? 6,
      removeTrailingZeros: options.removeTrailingZeros ?? true
    };
    
    // 初始化 TransformationBuilder
    this.transformationBuilder = new TransformationBuilder({
      coordinatePrecision: this.numericFormat.precision,
      anglePrecision: this.numericFormat.precision,
      dimensionPrecision: this.numericFormat.precision,
      numericPrecision: this.numericFormat.precision
    });
    
    // 初始化 ComponentStructureBuilder
    this.componentStructureBuilder = new ComponentStructureBuilder();
  }
  
  /**
   * 格式化数值为字符串，应用精度控制
   * @param value 数值
   * @param precision 可选的精度覆盖
   * @returns 格式化后的字符串
   */
  protected formatNumeric(value: number | string, precision?: number): string {
    // 如果已经是字符串，尝试解析为数字
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // 检查是否为有效数字
    if (isNaN(numValue) || !isFinite(numValue)) {
      console.warn(`Invalid numeric value: ${value}, using "0"`);
      return '0';
    }
    
    // 使用指定精度或默认精度
    const actualPrecision = precision ?? this.numericFormat.precision;
    
    // 格式化为固定小数位数
    let formatted = numValue.toFixed(actualPrecision);
    
    // 移除尾随零（如果启用）
    if (this.numericFormat.removeTrailingZeros) {
      formatted = this.removeTrailingZeros(formatted);
    }
    
    return formatted;
  }
  
  /**
   * 移除尾随零和不必要的小数点
   * @param value 数值字符串
   * @returns 清理后的字符串
   */
  private removeTrailingZeros(value: string): string {
    // 如果不包含小数点，直接返回
    if (!value.includes('.')) {
      return value;
    }
    
    // 移除尾随零
    let result = value.replace(/\.?0+$/, '');
    
    // 如果结果为空或只有负号，返回"0"
    if (result === '' || result === '-') {
      return '0';
    }
    
    return result;
  }
  
  /**
   * 验证并格式化坐标值
   * @param value 坐标值
   * @returns 格式化后的坐标字符串
   */
  protected formatCoordinate(value: number | string): string {
    return this.formatNumeric(value);
  }
  
  /**
   * 验证并格式化尺寸值（直径、宽度、高度等）
   * @param value 尺寸值
   * @returns 格式化后的尺寸字符串
   */
  protected formatDimension(value: number | string): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // 尺寸值不能为负
    if (numValue < 0) {
      console.warn(`Negative dimension value: ${value}, using absolute value`);
      return this.formatNumeric(Math.abs(numValue));
    }
    
    return this.formatNumeric(numValue);
  }
  
  /**
   * 验证并格式化角度值
   * @param value 角度值（度）
   * @returns 格式化后的角度字符串
   */
  protected formatAngle(value: number | string): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // 将角度规范化到 [0, 360) 范围
    let normalized = numValue % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    
    return this.formatNumeric(normalized);
  }

  /**
   * 将EDMDDataSet转换为XML字符串
   */
  serialize(dataset: EDMDDataSet): string {
    const doc = create({ version: '1.0', encoding: this.encoding });
    
    // 创建根元素
    const root = doc.ele('foundation:EDMDDataSet', this.namespaces);
    
    // 添加自定义命名空间
    if (dataset.namespaces) {
      Object.entries(dataset.namespaces).forEach(([key, value]) => {
        root.att(key, value);
      });
    }
    
    // 构建Header
    this.buildHeader(root, dataset.Header);
    
    // 构建Body
    this.buildBody(root, dataset.Body);
    
    // 构建ProcessInstruction
    this.buildProcessInstruction(root, dataset.ProcessInstruction);
    
    // 构建历史记录（如果有）
    if (dataset.History && dataset.History.length > 0) {
      this.buildHistory(root, dataset.History);
    }

    return doc.end({
      prettyPrint: this.prettyPrint,
      indent: '  ',
      newline: '\n'
    });
  }

  /**
   * 构建ProcessInstruction
   * 
   * 根据 IDX V4.5 协议第 31 页，ProcessInstruction 应该使用 computational 命名空间
   */
  private buildProcessInstruction(root: any, instruction: EDMDProcessInstruction): void {
    const instructionElement = root.ele('foundation:ProcessInstruction', { 
      'xsi:type': `computational:EDMDProcessInstruction${instruction.instructionType}`,
      id: instruction.id
    });
    
    instructionElement.ele('foundation:InstructionType').txt(instruction.instructionType);
    
    // 根据指令类型添加特定内容
    if (instruction.instructionType === 'SendChanges') {
      // 添加变更相关内容
      // TODO: 实现变更指令的具体内容
    }
  }

  /**
   * 构建History
   */
  private buildHistory(root: any, history: any[]): void {
    // TODO: 实现历史记录构建
    // 目前大多数实现不需要历史记录
  }

  /**
   * 构建几何元素
   */
  private buildGeometricElement(parent: any, element: any): void {
    if (element['xsi:type'] === 'd2:EDMDCartesianPoint') {
      // 构建CartesianPoint
      const pointElement = parent.ele('foundation:CartesianPoint', { 
        id: element.id, 
        'xsi:type': 'd2:EDMDCartesianPoint' 
      });
      
      const xElement = pointElement.ele('d2:X');
      xElement.ele('property:Value').txt(this.formatCoordinate(element.X['property:Value']));
      
      const yElement = pointElement.ele('d2:Y');
      yElement.ele('property:Value').txt(this.formatCoordinate(element.Y['property:Value']));
      
    } else if (element.type === 'PolyLine') {
      // 构建PolyLine
      const polyElement = parent.ele('foundation:PolyLine', { id: element.id });
      
      if (element.Point && Array.isArray(element.Point)) {
        element.Point.forEach((point: any) => {
          polyElement.ele('d2:Point').txt(point['d2:Point']);
        });
      }
    } else if (element.type === 'CircleCenter') {
      // 构建CircleCenter
      const circleElement = parent.ele('foundation:CircleCenter', { id: element.id });
      
      circleElement.ele('d2:CenterPoint').txt(element.CenterPoint);
      
      const diameterElement = circleElement.ele('d2:Diameter');
      diameterElement.ele('property:Value').txt(this.formatDimension(element.Diameter['property:Value']));
    }
  }

  /**
   * 构建曲线集2D
   * 
   * 根据需求 8.1-8.2，统一使用 d2:EDMDCurveSet2d（小写 d）类型命名
   */
  private buildCurveSet2D(parent: any, curveSet: any): void {
    const curveSetElement = parent.ele('foundation:CurveSet2d', { 
      id: curveSet.id, 
      'xsi:type': 'd2:EDMDCurveSet2d'  // 统一使用小写 d
    });
    
    curveSetElement.ele('pdm:ShapeDescriptionType').txt(curveSet['pdm:ShapeDescriptionType']);
    
    const lowerBoundElement = curveSetElement.ele('d2:LowerBound');
    lowerBoundElement.ele('property:Value').txt(this.formatCoordinate(curveSet['d2:LowerBound']['property:Value']));
    
    const upperBoundElement = curveSetElement.ele('d2:UpperBound');
    upperBoundElement.ele('property:Value').txt(this.formatCoordinate(curveSet['d2:UpperBound']['property:Value']));
    
    curveSetElement.ele('d2:DetailedGeometricModelElement').txt(curveSet['d2:DetailedGeometricModelElement']);
  }

  /**
   * 构建形状元素
   */
  private buildShapeElement(parent: any, shapeElement: any): void {
    const shapeElementEl = parent.ele('foundation:ShapeElement', { id: shapeElement.id });
    
    shapeElementEl.ele('pdm:ShapeElementType').txt(shapeElement['pdm:ShapeElementType']);
    shapeElementEl.ele('pdm:Inverted').txt(shapeElement['pdm:Inverted']);
    shapeElementEl.ele('pdm:DefiningShape').txt(shapeElement['pdm:DefiningShape']);
  }

  /**
   * 构建形状
   */
  private buildShape(parent: any, shape: any): void {
    // TODO: 实现形状构建
    // 这需要根据具体的形状类型来实现
  }

  /**
   * 构建3D模型
   */
  private build3DModel(parent: any, model: any): void {
    // TODO: 实现3D模型构建
  }

  /**
   * 构建用户属性
   * 
   * 根据 IDX V4.5 协议，用户属性应该使用 property:UserProperty 元素名称，
   * 配合 xsi:type="property:EDMDUserSimpleProperty" 类型声明
   */
  private buildUserProperty(parent: any, prop: any): void {
    const propElement = parent.ele('property:UserProperty', {
      'xsi:type': 'property:EDMDUserSimpleProperty'
    });
    
    // 构建属性键
    const keyElement = propElement.ele('property:Key');
    keyElement.ele('foundation:SystemScope').txt(prop.Key.SystemScope);
    keyElement.ele('foundation:ObjectName').txt(prop.Key.ObjectName);
    
    // 构建属性值 - 智能格式化数值
    let formattedValue: string;
    const rawValue = prop.Value;
    
    // 检查是否为数值类型
    if (typeof rawValue === 'number') {
      // 根据属性名称决定格式化方式
      const objectName = prop.Key.ObjectName.toLowerCase();
      
      if (objectName.includes('angle') || objectName.includes('rotation')) {
        formattedValue = this.formatAngle(rawValue);
      } else if (objectName.includes('diameter') || objectName.includes('width') || 
                 objectName.includes('height') || objectName.includes('thickness')) {
        formattedValue = this.formatDimension(rawValue);
      } else if (objectName.includes('bound') || objectName.includes('position') || 
                 objectName.includes('offset') || objectName === 'x' || objectName === 'y' || objectName === 'z') {
        formattedValue = this.formatCoordinate(rawValue);
      } else {
        formattedValue = this.formatNumeric(rawValue);
      }
    } else {
      // 非数值类型，直接转换为字符串
      formattedValue = rawValue.toString();
    }
    
    propElement.ele('property:Value').txt(formattedValue);
    
    if (prop.IsChanged !== undefined) {
      propElement.att('IsChanged', prop.IsChanged.toString());
    }
  }

  /**
   * 构建项目实例
   * 
   * 根据 IDX V4.5 协议，Item 引用应该使用元素文本内容，而不是 href 属性
   */
  private buildItemInstance(parent: any, instance: any): void {
    const instanceElement = parent.ele('pdm:ItemInstance', { id: instance.id });
    
    // 移除 # 前缀（如果有）
    const itemId = instance.Item.startsWith('#') ? instance.Item.substring(1) : instance.Item;
    instanceElement.ele('pdm:Item').txt(itemId);
    
    // 构建实例名称
    const nameElement = instanceElement.ele('pdm:InstanceName');
    nameElement.ele('foundation:SystemScope').txt(instance.InstanceName.SystemScope);
    nameElement.ele('foundation:ObjectName').txt(instance.InstanceName.ObjectName);
    
    // 构建变换矩阵（如果有）
    if (instance.Transformation) {
      this.buildTransformation(instanceElement, instance.Transformation);
    }
  }

  /**
   * 构建变换矩阵
   * 
   * 根据 IDX V4.5 协议第 7.1-7.4 需求：
   * - 不使用 xsi:type 属性
   * - 添加 TransformationType 元素
   * - 使用 foundation:Value 包装 tx、ty、tz
   */
  private buildTransformation(parent: any, transformation: any): void {
    // 使用 TransformationBuilder 构建正确格式的变换矩阵
    if (transformation.TransformationType === 'd2') {
      this.transformationBuilder.build2DTransformation(parent, transformation);
    } else if (transformation.TransformationType === 'd3') {
      this.transformationBuilder.build3DTransformation(parent, transformation);
    } else {
      console.warn(`Unknown transformation type: ${transformation.TransformationType}`);
      // 回退到旧格式（不推荐）
      this.buildTransformationLegacy(parent, transformation);
    }
  }
  
  /**
   * 旧版变换矩阵构建方法（仅用于回退）
   * @deprecated 使用 TransformationBuilder 代替
   */
  private buildTransformationLegacy(parent: any, transformation: any): void {
    const transElement = parent.ele('pdm:Transformation', { 
      'xsi:type': `d2:EDMDTransformation${transformation.TransformationType.toUpperCase()}` 
    });
    
    if (transformation.TransformationType === 'd2') {
      // 变换矩阵元素（旋转和缩放）
      transElement.ele('d2:xx').txt(this.formatNumeric(transformation.xx));
      transElement.ele('d2:xy').txt(this.formatNumeric(transformation.xy));
      transElement.ele('d2:yx').txt(this.formatNumeric(transformation.yx));
      transElement.ele('d2:yy').txt(this.formatNumeric(transformation.yy));
      
      // 平移向量
      const txElement = transElement.ele('d2:tx');
      txElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.tx.Value));
      
      const tyElement = transElement.ele('d2:ty');
      tyElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.ty.Value));
      
      // Z偏移（可选）
      if (transformation.zOffset) {
        const zElement = transElement.ele('d2:zOffset');
        zElement.ele('foundation:Value').txt(this.formatCoordinate(transformation.zOffset.Value));
      }
    }
  }

  /**
   * 构建Header
   */
  private buildHeader(root: any, header: EDMDHeader): void {
    const headerElement = root.ele('foundation:Header', { 'xsi:type': 'foundation:EDMDHeader' });
    
    if (header.Description) headerElement.ele('foundation:Description').txt(header.Description);
    if (header.CreatorName) headerElement.ele('foundation:CreatorName').txt(header.CreatorName);
    if (header.CreatorCompany) headerElement.ele('foundation:CreatorCompany').txt(header.CreatorCompany);
    if (header.CreatorSystem) headerElement.ele('foundation:CreatorSystem').txt(header.CreatorSystem);
    
    headerElement.ele('foundation:GlobalUnitLength').txt(header.GlobalUnitLength);
    headerElement.ele('foundation:CreationDateTime').txt(header.CreationDateTime);
    headerElement.ele('foundation:ModifiedDateTime').txt(header.ModifiedDateTime);
  }

  /**
   * 构建Body
   */
  private buildBody(root: any, body: EDMDDataSetBody): void {
    const bodyElement = root.ele('foundation:Body', { 'xsi:type': 'foundation:EDMDDataSetBody' });
    
    // 构建几何元素（按demo文件顺序）
    if (body.GeometricElements && body.GeometricElements.length > 0) {
      for (const element of body.GeometricElements) {
        this.buildGeometricElement(bodyElement, element);
      }
    }
    
    // 构建曲线集
    if (body.CurveSet2Ds && body.CurveSet2Ds.length > 0) {
      for (const curveSet of body.CurveSet2Ds) {
        this.buildCurveSet2D(bodyElement, curveSet);
      }
    }
    
    // 构建形状元素
    if (body.ShapeElements && body.ShapeElements.length > 0) {
      for (const shapeElement of body.ShapeElements) {
        this.buildShapeElement(bodyElement, shapeElement);
      }
    }
    
    // 构建所有项目
    for (const item of body.Items) {
      this.buildItem(bodyElement, item);
    }
    
    // 构建所有形状（如果独立存储）
    if (body.Shapes && body.Shapes.length > 0) {
      for (const shape of body.Shapes) {
        this.buildShape(bodyElement, shape);
      }
    }
    
    // 构建3D模型
    if (body.Models3D && body.Models3D.length > 0) {
      for (const model of body.Models3D) {
        this.build3DModel(bodyElement, model);
      }
    }
  }

  /**
   * 构建EDMDItem
   * 
   * 根据 IDX V4.5 协议需求 3.1-3.7，组件需要使用三层结构：
   * 1. 顶层 assembly Item（包含 ItemInstance 和 AssembleToName）
   * 2. 中间 single Item（定义组件本体，包含 PackageName、用户属性和形状引用）
   * 3. 底层形状元素
   */
  private buildItem(parent: any, item: EDMDItem): void {
    // 检查是否为组件，如果是则使用三层结构
    if (this.isComponentItem(item)) {
      this.buildComponentWithThreeLayerStructure(parent, item);
      return;
    }
    
    // 非组件项目使用标准构建方法
    this.buildStandardItem(parent, item);
  }
  
  /**
   * 判断是否为组件项目
   * 
   * 根据以下条件判断：
   * - geometryType 为 COMPONENT
   * - 或者包含 RefDes 用户属性
   * - 或者包含 PackageName
   */
  private isComponentItem(item: EDMDItem): boolean {
    // 检查 geometryType
    if (item.geometryType === 'COMPONENT' || 
        item.geometryType === 'COMPONENT_MECHANICAL') {
      return true;
    }
    
    // 检查是否有 RefDes 属性
    if (item.UserProperties?.some(p => p.Key?.ObjectName === 'RefDes')) {
      return true;
    }
    
    // 检查是否有 PackageName（通常组件都有封装名称）
    if (item.PackageName) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 使用三层结构构建组件
   * 
   * 根据需求 3.1-3.7：
   * - 创建顶层 assembly Item
   * - 创建中间 single Item
   * - 顶层 Item 不直接引用形状
   * - ItemInstance 引用中间 single Item
   */
  private buildComponentWithThreeLayerStructure(parent: any, item: EDMDItem): void {
    // 准备组件数据
    const componentData: ComponentData = {
      id: item.id,
      name: item.Name || 'Component',
      identifier: item.Identifier || {
        SystemScope: 'ECAD',
        Number: item.id,
        Version: 1,
        Revision: 0,
        Sequence: 0
      },
      packageName: item.PackageName || {
        SystemScope: 'ECAD',
        ObjectName: 'Unknown'
      },
      userProperties: item.UserProperties || [],
      shapeIds: item.Shape ? [typeof item.Shape === 'string' ? item.Shape : item.Shape.toString()] : [],
      assembleToName: item.AssembleToName || 'TOP',
      transformation: item.ItemInstances && item.ItemInstances.length > 0 && item.ItemInstances[0].Transformation
        ? item.ItemInstances[0].Transformation
        : {
            TransformationType: 'd2',
            xx: 1, xy: 0, yx: 0, yy: 1,
            tx: { Value: 0 },
            ty: { Value: 0 }
          },
      baseline: item.BaseLine
    };
    
    // 使用 ComponentStructureBuilder 构建三层结构
    const structure = this.componentStructureBuilder.buildComponentStructure(componentData);
    
    // 先构建中间 single Item（因为 assembly 会引用它）
    this.buildStandardItem(parent, structure.singleItem);
    
    // 然后构建顶层 assembly Item
    this.buildStandardItem(parent, structure.assemblyItem);
    
    // 注意：shapeElements 通常已经在 Body 中定义，这里不需要再次构建
  }
  
  /**
   * 构建标准 Item（非组件或组件的子项）
   */
  private buildStandardItem(parent: any, item: EDMDItem): void {
    const itemAttrs: Record<string, any> = { id: item.id };
    
    if (item.IsAttributeChanged !== undefined) {
      itemAttrs.IsAttributeChanged = item.IsAttributeChanged.toString();
    }
    
    if (item.geometryType) {
      itemAttrs.geometryType = item.geometryType;
    }
    
    const itemElement = parent.ele('foundation:Item', itemAttrs);
    
    if (item.Name) itemElement.ele('foundation:Name').txt(item.Name);
    if (item.Description) itemElement.ele('foundation:Description').txt(item.Description);
    
    // 根据需求 6.1-6.4 确定正确的 ItemType
    const correctItemType = this.determineCorrectItemType(item);
    itemElement.ele('pdm:ItemType').txt(correctItemType);
    
    // 构建标识符
    if (item.Identifier) {
      this.buildIdentifier(itemElement, item.Identifier);
    }
    
    // 构建包名称
    if (item.PackageName) {
      const packageElement = itemElement.ele('pdm:PackageName');
      packageElement.ele('foundation:SystemScope').txt(item.PackageName.SystemScope);
      packageElement.ele('foundation:ObjectName').txt(item.PackageName.ObjectName);
    }
    
    // 构建用户属性
    if (item.UserProperties && item.UserProperties.length > 0) {
      for (const prop of item.UserProperties) {
        this.buildUserProperty(itemElement, prop);
      }
    }
    
    // 构建项目实例（仅装配体）
    if (correctItemType === ItemType.ASSEMBLY && item.ItemInstances) {
      for (const instance of item.ItemInstances) {
        this.buildItemInstance(itemElement, instance);
      }
    }
    
    // 构建形状引用
    // 根据 IDX V4.5 协议，形状引用应该使用元素文本内容，而不是 href 属性
    if (item.Shape) {
      if (typeof item.Shape === 'string') {
        // 移除 # 前缀（如果有）
        const shapeId = item.Shape.startsWith('#') ? item.Shape.substring(1) : item.Shape;
        itemElement.ele('pdm:Shape').txt(shapeId);
      } else {
        // 对于复杂形状对象，需要根据具体类型处理
        // 这里暂时跳过，实际实现中应该根据形状类型进行序列化
        console.warn(`项目${item.id}包含复杂形状对象，暂时跳过序列化`);
      }
    }
    
    // 构建基线标记 - 根据需求 10.1-10.4 使用正确格式
    if (item.BaseLine !== undefined) {
      // 使用 <pdm:BaseLine>true</pdm:BaseLine> 格式，注意大小写
      itemElement.ele('pdm:BaseLine').txt(item.BaseLine.toString());
    }
    
    // 构建装配到名称
    if (item.AssembleToName) {
      itemElement.ele('pdm:AssembleToName').txt(item.AssembleToName);
    }
  }

  /**
   * 根据需求 9.1-9.4 确定正确的 ShapeDescriptionType
   * 
   * @param geometryType - 几何类型
   * @param hasDetailedGeometry - 是否包含详细几何信息
   * @param hasPreciseZBounds - 是否有精确的Z边界
   * @returns 正确的 ShapeDescriptionType
   */
  protected determineShapeDescriptionType(
    geometryType?: string,
    hasDetailedGeometry: boolean = true,
    hasPreciseZBounds: boolean = true
  ): 'GeometricModel' | 'OUTLINE' {
    // 需求 9.1: 详细几何模型使用 GeometricModel
    // 需求 9.2: 简单 2.5D 轮廓可以使用 OUTLINE
    // 需求 9.3: 根据几何复杂度和精度要求选择
    
    // 对于需要精确几何表示的对象，使用 GeometricModel
    if (geometryType === 'BOARD_OUTLINE' || 
        geometryType === 'COMPONENT' ||
        geometryType === 'HOLE_PLATED' ||
        geometryType === 'HOLE_NON_PLATED' ||
        geometryType === 'FILLED_VIA') {
      return 'GeometricModel';
    }
    
    // 对于简单的约束区域，可以使用 OUTLINE
    if (geometryType?.startsWith('KEEPOUT_') || 
        geometryType === 'PLACEMENT_KEEPOUT' ||
        geometryType === 'ROUTING_KEEPOUT') {
      return 'OUTLINE';
    }
    
    // 默认情况：如果有详细几何或精确Z边界，使用 GeometricModel
    if (hasDetailedGeometry || hasPreciseZBounds) {
      return 'GeometricModel';
    }
    
    // 简单情况使用 OUTLINE
    return 'OUTLINE';
  }

  /**
   * 根据需求 6.1-6.4 确定正确的 ItemType
   * 
   * @param item - EDMDItem 对象
   * @returns 正确的 ItemType
   */
  private determineCorrectItemType(item: EDMDItem): ItemType {
    // 需求 6.1: 层叠结构使用 ItemType="assembly" 配合 geometryType="LAYER_STACKUP"
    if (item.geometryType === 'LAYER_STACKUP') {
      return ItemType.ASSEMBLY;
    }
    
    // 需求 6.2: 单个层使用 ItemType="assembly" 而不是 ItemType="single"
    if (item.geometryType && item.geometryType.startsWith('LAYER_')) {
      return ItemType.ASSEMBLY;
    }
    
    // 需求 6.3: 包含子项的对象使用 ItemType="assembly"
    if (item.ItemInstances && item.ItemInstances.length > 0) {
      return ItemType.ASSEMBLY;
    }
    
    // 需求 6.4: 独立的几何对象使用 ItemType="single"
    // 如果没有子项且不是层或层叠结构，则使用 single
    return ItemType.SINGLE;
  }

  /**
   * 构建EDMDIdentifier
   */
  private buildIdentifier(parent: any, identifier: EDMDIdentifier): void {
    const idElement = parent.ele('pdm:Identifier', { 'xsi:type': 'foundation:EDMDIdentifier' });
    
    idElement.ele('foundation:SystemScope').txt(identifier.SystemScope);
    idElement.ele('foundation:Number').txt(identifier.Number);
    idElement.ele('foundation:Version').txt(identifier.Version.toString());
    idElement.ele('foundation:Revision').txt(identifier.Revision.toString());
    idElement.ele('foundation:Sequence').txt(identifier.Sequence.toString());
  }
}