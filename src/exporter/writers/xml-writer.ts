// ============= XML写入器 =============
// DESIGN: 将EDMDDataSet转换为符合IDX v4.5规范的XML字符串
// REF: IDXv4.5规范第5章，XML Schema定义
// NOTE: 使用xmlbuilder2库进行XML构建

import { create } from 'xmlbuilder2';
import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import {
  EDMDDataSet,
  EDMDHeader,
  EDMDDataSetBody,
  EDMDItem,
  EDMDProcessInstruction,
  EDMDIdentifier,
  EDMDUserSimpleProperty,
  EDMDTransformation,
  EDMDItemInstance,
  ItemType,
  EDMDShapeElement,
  EDMDCurveSet2D,
  CartesianPoint,
  EDMDPolyLine,
  EDMDCircleCenter,
  EDMDLengthProperty
} from '../../types/core';

/**
 * XML写入器配置选项
 */
export interface XMLWriterOptions {
  /** 是否格式化输出（pretty print） */
  prettyPrint?: boolean;
  
  /** 缩进字符串 */
  indent?: string;
  
  /** 换行符 */
  newline?: string;
  
  /** 编码格式 */
  encoding?: string;
  
  /** 是否包含XML声明 */
  includeDeclaration?: boolean;
}

/**
 * XML写入器类
 * 
 * @remarks
 * 负责将EDMDDataSet转换为符合IDX v4.5规范的XML字符串
 * 
 * @example
 * ```typescript
 * const writer = new XMLWriter({ prettyPrint: true });
 * const xml = writer.serialize(dataset);
 * ```
 */
export class XMLWriter {
  private options: Required<XMLWriterOptions>;
  private namespaces: Record<string, string>;
  
  constructor(options: XMLWriterOptions = {}) {
    this.options = {
      prettyPrint: options.prettyPrint ?? true,
      indent: options.indent ?? '  ',
      newline: options.newline ?? '\n',
      encoding: options.encoding ?? 'UTF-8',
      includeDeclaration: options.includeDeclaration ?? true
    };
    
    // IDX v4.5标准命名空间
    this.namespaces = {
      'xmlns:foundation': 'http://www.prostep.org/EDMD/Foundation',
      'xmlns:pdm': 'http://www.prostep.org/EDMD/PDM',
      'xmlns:d2': 'http://www.prostep.org/EDMD/2D',
      'xmlns:property': 'http://www.prostep.org/EDMD/Property',
      'xmlns:computational': 'http://www.prostep.org/EDMD/Computational',
      'xmlns:administration': 'http://www.prostep.org/EDMD/Administration',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.prostep.org/EDMD/Foundation foundation.xsd'
    };
  }
  
  /**
   * 将EDMDDataSet序列化为XML字符串
   * 
   * @param dataset - 要序列化的数据集
   * @returns XML字符串
   */
  serialize(dataset: EDMDDataSet): string {
    try {
      // 创建根元素
      const root = this.createRootElement(dataset);
      
      // 构建Header
      this.buildHeader(root, dataset.Header);
      
      // 构建Body
      this.buildBody(root, dataset.Body);
      
      // 构建ProcessInstruction
      this.buildProcessInstruction(root, dataset.ProcessInstruction);
      
      // 生成XML字符串
      const xml = root.end({
        prettyPrint: this.options.prettyPrint,
        indent: this.options.indent,
        newline: this.options.newline
      });
      
      // 添加XML声明
      if (this.options.includeDeclaration) {
        return `<?xml version="1.0" encoding="${this.options.encoding}"?>${this.options.newline}${xml}`;
      }
      
      return xml;
      
    } catch (error: any) {
      throw new XMLSerializationError(
        `XML序列化失败: ${error.message}`,
        { originalError: error, dataset }
      );
    }
  }
  
  /**
   * 创建根元素
   */
  private createRootElement(dataset: EDMDDataSet): XMLBuilder {
    const attributes = { ...this.namespaces };
    
    // 添加自定义命名空间
    if (dataset.namespaces) {
      Object.assign(attributes, dataset.namespaces);
    }
    
    return create({ version: '1.0', encoding: this.options.encoding })
      .ele('foundation:EDMDDataSet', attributes);
  }
  
  /**
   * 构建Header元素
   */
  private buildHeader(parent: XMLBuilder, header: EDMDHeader): void {
    const headerEle = parent.ele('foundation:Header', {
      'xsi:type': 'foundation:EDMDHeader'
    });
    
    // 可选字段
    if (header.Description) {
      headerEle.ele('foundation:Description').txt(header.Description);
    }
    
    if (header.CreatorName) {
      headerEle.ele('foundation:CreatorName').txt(header.CreatorName);
    }
    
    if (header.CreatorCompany) {
      headerEle.ele('foundation:CreatorCompany').txt(header.CreatorCompany);
    }
    
    if (header.CreatorSystem) {
      headerEle.ele('foundation:CreatorSystem').txt(header.CreatorSystem);
    }
    
    if (header.PostProcessor) {
      headerEle.ele('foundation:PostProcessor').txt(header.PostProcessor);
    }
    
    if (header.PostProcessorVersion) {
      headerEle.ele('foundation:PostProcessorVersion').txt(header.PostProcessorVersion);
    }
    
    if (header.Creator) {
      headerEle.ele('foundation:Creator').txt(header.Creator);
    }
    
    // 必需字段
    headerEle.ele('foundation:GlobalUnitLength').txt(header.GlobalUnitLength);
    headerEle.ele('foundation:CreationDateTime').txt(header.CreationDateTime);
    headerEle.ele('foundation:ModifiedDateTime').txt(header.ModifiedDateTime);
  }
  
  /**
   * 构建Body元素
   */
  private buildBody(parent: XMLBuilder, body: EDMDDataSetBody): void {
    const bodyEle = parent.ele('foundation:Body', {
      'xsi:type': 'foundation:EDMDDataSetBody'
    });
    
    // 构建所有项目
    if (body.Items && body.Items.length > 0) {
      for (const item of body.Items) {
        this.buildItem(bodyEle, item);
      }
    }
    
    // 构建独立的形状（如果有）
    if (body.Shapes && body.Shapes.length > 0) {
      for (const shape of body.Shapes) {
        this.buildShapeElement(bodyEle, shape as EDMDShapeElement);
      }
    }
    
    // 构建3D模型（如果有）
    if (body.Models3D && body.Models3D.length > 0) {
      // TODO: 实现3D模型序列化
    }
  }
  
  /**
   * 构建ProcessInstruction元素
   */
  private buildProcessInstruction(parent: XMLBuilder, instruction: EDMDProcessInstruction): void {
    const attrs: Record<string, string> = {
      id: instruction.id
    };
    
    // 根据指令类型设置xsi:type
    if (instruction.instructionType === 'SendInformation') {
      attrs['xsi:type'] = 'computational:EDMDProcessInstructionSendInformation';
    } else if (instruction.instructionType === 'SendChanges') {
      attrs['xsi:type'] = 'computational:EDMDProcessInstructionSendChanges';
    }
    
    parent.ele('foundation:ProcessInstruction', attrs);
  }
  
  /**
   * 构建Item元素
   */
  private buildItem(parent: XMLBuilder, item: EDMDItem): void {
    const itemAttrs: Record<string, string> = {
      id: item.id
    };
    
    // 添加可选属性
    if (item.IsAttributeChanged !== undefined) {
      itemAttrs.IsAttributeChanged = item.IsAttributeChanged.toString();
    }
    
    if (item.geometryType) {
      itemAttrs.geometryType = item.geometryType;
    }
    
    const itemEle = parent.ele('foundation:Item', itemAttrs);
    
    // 基础属性
    if (item.Name) {
      itemEle.ele('foundation:Name').txt(item.Name);
    }
    
    if (item.Description) {
      itemEle.ele('foundation:Description').txt(item.Description);
    }
    
    // ItemType（必需）
    itemEle.ele('pdm:ItemType').txt(item.ItemType);
    
    // Identifier
    if (item.Identifier) {
      this.buildIdentifier(itemEle, item.Identifier);
    }
    
    // PackageName
    if (item.PackageName) {
      const pkgEle = itemEle.ele('pdm:PackageName');
      pkgEle.ele('foundation:SystemScope').txt(item.PackageName.SystemScope);
      pkgEle.ele('foundation:ObjectName').txt(item.PackageName.ObjectName);
    }
    
    // ReferenceName
    if (item.ReferenceName) {
      itemEle.ele('pdm:ReferenceName').txt(item.ReferenceName);
    }
    
    // AssembleToName
    if (item.AssembleToName) {
      itemEle.ele('pdm:AssembleToName').txt(item.AssembleToName);
    }
    
    // UserProperties
    if (item.UserProperties && item.UserProperties.length > 0) {
      for (const prop of item.UserProperties) {
        this.buildUserProperty(itemEle, prop);
      }
    }
    
    // ItemInstances（仅当ItemType为ASSEMBLY时）
    if (item.ItemType === ItemType.ASSEMBLY && item.ItemInstances) {
      for (const instance of item.ItemInstances) {
        this.buildItemInstance(itemEle, instance);
      }
    }
    
    // Shape
    if (item.Shape) {
      if (typeof item.Shape === 'string') {
        // 引用形状
        itemEle.ele('pdm:Shape').att('href', `#${item.Shape}`);
      } else {
        // 内联形状
        this.buildShapeElement(itemEle.ele('pdm:Shape'), item.Shape as EDMDShapeElement);
      }
    }
  }
  
  /**
   * 构建Identifier元素
   */
  private buildIdentifier(parent: XMLBuilder, identifier: EDMDIdentifier): void {
    const idEle = parent.ele('pdm:Identifier', {
      'xsi:type': 'foundation:EDMDIdentifier'
    });
    
    idEle.ele('foundation:SystemScope').txt(identifier.SystemScope);
    idEle.ele('foundation:Number').txt(identifier.Number);
    idEle.ele('foundation:Version').txt(identifier.Version.toString());
    idEle.ele('foundation:Revision').txt(identifier.Revision.toString());
    idEle.ele('foundation:Sequence').txt(identifier.Sequence.toString());
  }
  
  /**
   * 构建UserProperty元素
   */
  private buildUserProperty(parent: XMLBuilder, prop: EDMDUserSimpleProperty): void {
    const propEle = parent.ele('foundation:UserProperty', {
      'xsi:type': 'property:EDMDUserSimpleProperty'
    });
    
    // Key
    const keyEle = propEle.ele('property:Key');
    keyEle.ele('foundation:SystemScope').txt(prop.Key.SystemScope);
    keyEle.ele('foundation:ObjectName').txt(prop.Key.ObjectName);
    
    // Value
    propEle.ele('property:Value').txt(String(prop.Value));
    
    // 可选属性
    if (prop.IsChanged !== undefined) {
      propEle.ele('property:IsChanged').txt(prop.IsChanged.toString());
    }
    
    if (prop.IsNew !== undefined) {
      propEle.ele('property:IsNew').txt(prop.IsNew.toString());
    }
    
    if (prop.Persistent !== undefined) {
      propEle.ele('property:Persistent').txt(prop.Persistent.toString());
    }
  }
  
  /**
   * 构建ItemInstance元素
   */
  private buildItemInstance(parent: XMLBuilder, instance: EDMDItemInstance): void {
    const instEle = parent.ele('pdm:ItemInstance', {
      id: instance.id
    });
    
    // InstanceName
    const nameEle = instEle.ele('pdm:InstanceName');
    nameEle.ele('foundation:SystemScope').txt(instance.InstanceName.SystemScope);
    nameEle.ele('foundation:ObjectName').txt(instance.InstanceName.ObjectName);
    
    // Transformation
    if (instance.Transformation) {
      this.buildTransformation(instEle, instance.Transformation);
    }
    
    // zOffset
    if (instance.zOffset) {
      this.buildLengthProperty(instEle.ele('pdm:zOffset'), instance.zOffset);
    }
    
    // UserProperties
    if (instance.UserProperties && instance.UserProperties.length > 0) {
      for (const prop of instance.UserProperties) {
        this.buildUserProperty(instEle, prop);
      }
    }
    
    // Item引用
    if (instance.Item) {
      instEle.ele('pdm:Item').att('href', `#${instance.Item}`);
    }
  }
  
  /**
   * 构建Transformation元素
   */
  private buildTransformation(parent: XMLBuilder, transform: EDMDTransformation): void {
    const transEle = parent.ele('pdm:Transformation');
    
    transEle.ele('pdm:TransformationType').txt(transform.TransformationType);
    
    if (transform.TransformationType === 'd2') {
      // 2D变换
      transEle.ele('pdm:xx').txt(transform.xx.toString());
      transEle.ele('pdm:xy').txt(transform.xy.toString());
      transEle.ele('pdm:yx').txt(transform.yx.toString());
      transEle.ele('pdm:yy').txt(transform.yy.toString());
      
      this.buildLengthProperty(transEle.ele('pdm:tx'), transform.tx);
      this.buildLengthProperty(transEle.ele('pdm:ty'), transform.ty);
      
      if (transform.zOffset) {
        this.buildLengthProperty(transEle.ele('pdm:zOffset'), transform.zOffset);
      }
    } else if (transform.TransformationType === 'd3') {
      // 3D变换
      transEle.ele('pdm:xx').txt(transform.xx.toString());
      transEle.ele('pdm:xy').txt(transform.xy.toString());
      transEle.ele('pdm:xz').txt(transform.xz.toString());
      transEle.ele('pdm:yx').txt(transform.yx.toString());
      transEle.ele('pdm:yy').txt(transform.yy.toString());
      transEle.ele('pdm:yz').txt(transform.yz.toString());
      transEle.ele('pdm:zx').txt(transform.zx.toString());
      transEle.ele('pdm:zy').txt(transform.zy.toString());
      transEle.ele('pdm:zz').txt(transform.zz.toString());
      
      this.buildLengthProperty(transEle.ele('pdm:tx'), transform.tx);
      this.buildLengthProperty(transEle.ele('pdm:ty'), transform.ty);
      this.buildLengthProperty(transEle.ele('pdm:tz'), transform.tz);
    }
  }
  
  /**
   * 构建ShapeElement元素
   */
  private buildShapeElement(parent: XMLBuilder, shape: EDMDShapeElement): void {
    const shapeEle = parent.ele('foundation:ShapeElement', {
      id: shape.id
    });
    
    shapeEle.ele('pdm:ShapeElementType').txt(shape.ShapeElementType);
    
    // DefiningShape
    if (shape.DefiningShape) {
      this.buildCurveSet2D(shapeEle.ele('pdm:DefiningShape'), shape.DefiningShape);
    }
    
    // Inverted
    shapeEle.ele('pdm:Inverted').txt(shape.Inverted.toString());
  }
  
  /**
   * 构建CurveSet2D元素
   */
  private buildCurveSet2D(parent: XMLBuilder, curveSet: EDMDCurveSet2D): void {
    const curveSetEle = parent.ele('foundation:CurveSet2d', {
      id: curveSet.id,
      'xsi:type': 'd2:EDMDCurveSet2d'
    });
    
    curveSetEle.ele('pdm:ShapeDescriptionType').txt(curveSet.ShapeDescriptionType);
    
    // LowerBound
    this.buildLengthProperty(curveSetEle.ele('d2:LowerBound'), curveSet.LowerBound);
    
    // UpperBound
    this.buildLengthProperty(curveSetEle.ele('d2:UpperBound'), curveSet.UpperBound);
    
    // DetailedGeometricModelElement
    if (curveSet.DetailedGeometricModelElement) {
      for (const element of curveSet.DetailedGeometricModelElement) {
        if (typeof element === 'string') {
          // 引用
          curveSetEle.ele('d2:DetailedGeometricModelElement').att('href', `#${element}`);
        } else {
          // 内联几何
          this.buildCurve(curveSetEle.ele('d2:DetailedGeometricModelElement'), element);
        }
      }
    }
  }
  
  /**
   * 构建曲线元素
   */
  private buildCurve(parent: XMLBuilder, curve: any): void {
    if (!curve || !curve.curveType) {
      return;
    }
    
    switch (curve.curveType) {
      case 'EDMDPolyLine':
        this.buildPolyLine(parent, curve as EDMDPolyLine);
        break;
      case 'EDMDCircleCenter':
        this.buildCircleCenter(parent, curve as EDMDCircleCenter);
        break;
      // TODO: 添加其他曲线类型支持
      default:
        console.warn(`不支持的曲线类型: ${curve.curveType}`);
    }
  }
  
  /**
   * 构建PolyLine元素
   */
  private buildPolyLine(parent: XMLBuilder, polyLine: EDMDPolyLine): void {
    const polyEle = parent.ele('foundation:PolyLine', {
      id: polyLine.id,
      'xsi:type': 'd2:EDMDPolyLine'
    });
    
    // Thickness（可选）
    if (polyLine.Thickness) {
      this.buildLengthProperty(polyEle.ele('d2:Thickness'), polyLine.Thickness);
    }
    
    // Points
    if (polyLine.Points && polyLine.Points.length > 0) {
      for (const point of polyLine.Points) {
        if (typeof point === 'string') {
          polyEle.ele('d2:Point').att('href', `#${point}`);
        } else {
          this.buildCartesianPoint(polyEle.ele('d2:Point'), point);
        }
      }
    }
  }
  
  /**
   * 构建CircleCenter元素
   */
  private buildCircleCenter(parent: XMLBuilder, circle: EDMDCircleCenter): void {
    const circleEle = parent.ele('foundation:CircleCenter', {
      id: circle.id,
      'xsi:type': 'd2:EDMDCircleCenter'
    });
    
    // CenterPoint
    if (circle.CenterPoint) {
      if (typeof circle.CenterPoint === 'string') {
        circleEle.ele('d2:CenterPoint').att('href', `#${circle.CenterPoint}`);
      } else {
        this.buildCartesianPoint(circleEle.ele('d2:CenterPoint'), circle.CenterPoint);
      }
    }
    
    // Diameter
    this.buildLengthProperty(circleEle.ele('d2:Diameter'), circle.Diameter);
  }
  
  /**
   * 构建CartesianPoint元素
   */
  private buildCartesianPoint(parent: XMLBuilder, point: CartesianPoint): void {
    const pointEle = parent.ele('foundation:CartesianPoint', {
      id: point.id,
      'xsi:type': 'd2:EDMDCartesianPoint'
    });
    
    this.buildLengthProperty(pointEle.ele('d2:X'), { Value: point.X });
    this.buildLengthProperty(pointEle.ele('d2:Y'), { Value: point.Y });
  }
  
  /**
   * 构建LengthProperty元素
   */
  private buildLengthProperty(parent: XMLBuilder, length: EDMDLengthProperty): void {
    const propEle = parent.ele('property:Value').txt(length.Value.toString());
    
    if (length.Unit) {
      propEle.att('unit', length.Unit);
    }
  }
}

/**
 * XML序列化错误
 */
export class XMLSerializationError extends Error {
  constructor(
    message: string,
    public context?: { originalError?: Error; dataset?: any }
  ) {
    super(message);
    this.name = 'XMLSerializationError';
  }
}
