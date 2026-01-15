import { create } from "xmlbuilder2";
import { EDMDDataSet, EDMDHeader, EDMDDataSetBody, EDMDItem, ItemType, EDMDIdentifier, EDMDProcessInstruction } from "../../types/core";

/**
 * XML写入器选项
 */
export interface XMLWriterOptions {
  /** 是否格式化输出 */
  prettyPrint?: boolean;
  
  /** 字符编码 */
  encoding?: string;
}

// src/exporter/writers/xml-writer.ts
export class XMLWriter {
  private namespaces: Record<string, string>;
  private prettyPrint: boolean;
  private encoding: string;

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
   */
  private buildProcessInstruction(root: any, instruction: EDMDProcessInstruction): void {
    const instructionElement = root.ele('foundation:ProcessInstruction', { 
      'xsi:type': `foundation:EDMD${instruction.instructionType}`,
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
      xElement.ele('property:Value').txt(element.X['property:Value']);
      
      const yElement = pointElement.ele('d2:Y');
      yElement.ele('property:Value').txt(element.Y['property:Value']);
      
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
      diameterElement.ele('property:Value').txt(element.Diameter['property:Value']);
    }
  }

  /**
   * 构建曲线集2D
   */
  private buildCurveSet2D(parent: any, curveSet: any): void {
    const curveSetElement = parent.ele('foundation:CurveSet2d', { 
      id: curveSet.id, 
      'xsi:type': curveSet['xsi:type'] 
    });
    
    curveSetElement.ele('pdm:ShapeDescriptionType').txt(curveSet['pdm:ShapeDescriptionType']);
    
    const lowerBoundElement = curveSetElement.ele('d2:LowerBound');
    lowerBoundElement.ele('property:Value').txt(curveSet['d2:LowerBound']['property:Value']);
    
    const upperBoundElement = curveSetElement.ele('d2:UpperBound');
    upperBoundElement.ele('property:Value').txt(curveSet['d2:UpperBound']['property:Value']);
    
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
   */
  private buildUserProperty(parent: any, prop: any): void {
    const propElement = parent.ele('property:UserSimpleProperty');
    
    // 构建属性键
    const keyElement = propElement.ele('property:Key');
    keyElement.ele('foundation:SystemScope').txt(prop.Key.SystemScope);
    keyElement.ele('foundation:ObjectName').txt(prop.Key.ObjectName);
    
    // 构建属性值
    propElement.ele('property:Value').txt(prop.Value.toString());
    
    if (prop.IsChanged !== undefined) {
      propElement.att('IsChanged', prop.IsChanged.toString());
    }
  }

  /**
   * 构建项目实例
   */
  private buildItemInstance(parent: any, instance: any): void {
    const instanceElement = parent.ele('pdm:ItemInstance', { id: instance.id });
    
    instanceElement.ele('pdm:Item').att('href', `#${instance.Item}`);
    
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
   */
  private buildTransformation(parent: any, transformation: any): void {
    const transElement = parent.ele('pdm:Transformation', { 
      'xsi:type': `d2:EDMDTransformation${transformation.TransformationType.toUpperCase()}` 
    });
    
    if (transformation.TransformationType === 'd2') {
      transElement.ele('d2:xx').txt(transformation.xx.toString());
      transElement.ele('d2:xy').txt(transformation.xy.toString());
      transElement.ele('d2:yx').txt(transformation.yx.toString());
      transElement.ele('d2:yy').txt(transformation.yy.toString());
      
      const txElement = transElement.ele('d2:tx');
      txElement.ele('foundation:Value').txt(transformation.tx.Value.toString());
      
      const tyElement = transElement.ele('d2:ty');
      tyElement.ele('foundation:Value').txt(transformation.ty.Value.toString());
      
      if (transformation.zOffset) {
        const zElement = transElement.ele('d2:zOffset');
        zElement.ele('foundation:Value').txt(transformation.zOffset.Value.toString());
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
   */
  private buildItem(parent: any, item: EDMDItem): void {
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
    
    itemElement.ele('pdm:ItemType').txt(item.ItemType);
    
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
    if (item.ItemType === ItemType.ASSEMBLY && item.ItemInstances) {
      for (const instance of item.ItemInstances) {
        this.buildItemInstance(itemElement, instance);
      }
    }
    
    // 构建形状引用
    if (item.Shape) {
      if (typeof item.Shape === 'string') {
        itemElement.ele('pdm:Shape').att('href', `#${item.Shape}`);
      } else {
        // 对于复杂形状对象，需要根据具体类型处理
        // 这里暂时跳过，实际实现中应该根据形状类型进行序列化
        console.warn(`项目${item.id}包含复杂形状对象，暂时跳过序列化`);
      }
    }
    
    // 构建基线标记 - 根据demo格式
    if (item.Baseline) {
      const baselineElement = itemElement.ele('pdm:Baseline');
      baselineElement.ele('property:Value').txt(item.Baseline.Value);
    }
    
    // 构建装配到名称
    if (item.AssembleToName) {
      itemElement.ele('pdm:AssembleToName').txt(item.AssembleToName);
    }
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