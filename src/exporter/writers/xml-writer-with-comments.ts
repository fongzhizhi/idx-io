import { create } from "xmlbuilder2";
import { XMLWriter, XMLWriterOptions } from "./xml-writer";
import { CommentGenerator } from "./comment-generator";
import { EDMDDataSet, EDMDHeader, EDMDDataSetBody, EDMDItem, EDMDProcessInstruction, ItemType, GeometryType } from "../../types/core";

/**
 * 带注释的XML写入器选项
 */
export interface XMLWriterWithCommentsOptions extends XMLWriterOptions {
  /** 是否启用注释生成 */
  enableComments?: boolean;
  
  /** 是否在文件头部添加详细注释 */
  includeFileHeader?: boolean;
  
  /** 是否为每个项目添加注释 */
  includeItemComments?: boolean;
  
  /** 是否为几何元素添加注释 */
  includeGeometryComments?: boolean;
  
  /** 是否为节区添加分隔注释 */
  includeSectionComments?: boolean;
}

/**
 * 扩展的XML写入器，支持生成描述性注释
 * 继承XMLWriter并添加注释生成功能，提高IDX文件的可读性和调试体验
 */
export class XMLWriterWithComments extends XMLWriter {
  private commentGenerator: CommentGenerator;
  private options: XMLWriterWithCommentsOptions;
  
  constructor(options: XMLWriterWithCommentsOptions = {}) {
    super(options);
    this.options = {
      enableComments: true,
      includeFileHeader: true,
      includeItemComments: true,
      includeGeometryComments: true,
      includeSectionComments: true,
      ...options
    };
    this.commentGenerator = new CommentGenerator();
  }
  
  /**
   * 将EDMDDataSet转换为带注释的XML字符串
   */
  serialize(dataset: EDMDDataSet): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' });
    
    // 添加文件头注释
    if (this.options.enableComments && this.options.includeFileHeader) {
      doc.com(this.commentGenerator.generateFileHeader(dataset));
    }
    
    // 创建根元素
    const namespaces = {
      'xmlns:foundation': 'http://www.prostep.org/EDMD/Foundation',
      'xmlns:pdm': 'http://www.prostep.org/EDMD/PDM',
      'xmlns:d2': 'http://www.prostep.org/EDMD/2D',
      'xmlns:property': 'http://www.prostep.org/EDMD/Property',
      'xmlns:computational': 'http://www.prostep.org/EDMD/Computational',
      'xmlns:administration': 'http://www.prostep.org/EDMD/Administration',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.prostep.org/EDMD/Foundation ../schemas/EDMDSchema.foundation.xsd'
    };
    
    const root = doc.ele('foundation:EDMDDataSet', namespaces);
    
    // 添加自定义命名空间
    if (dataset.namespaces) {
      Object.entries(dataset.namespaces).forEach(([key, value]) => {
        root.att(key, value);
      });
    }
    
    // 添加数据集注释
    if (this.options.enableComments) {
      root.com(this.commentGenerator.generateDatasetComment(dataset));
    }
    
    // 构建Header（带注释）
    this.buildHeaderWithComments(root, dataset.Header);
    
    // 构建Body（带注释）
    this.buildBodyWithComments(root, dataset.Body);
    
    // 构建ProcessInstruction（带注释）
    this.buildProcessInstructionWithComments(root, dataset.ProcessInstruction);
    
    // 构建历史记录（如果有）
    if (dataset.History && dataset.History.length > 0) {
      if (this.options.enableComments && this.options.includeSectionComments) {
        root.com(this.commentGenerator.generateSectionComment('History', dataset.History.length));
      }
      // TODO: 需要时实现历史记录构建
    }

    return doc.end({
      prettyPrint: true,
      indent: '  ',
      newline: '\n'
    });
  }
  
  /**
   * 构建带注释的Header
   */
  private buildHeaderWithComments(root: any, header: EDMDHeader): void {
    if (this.options.enableComments && this.options.includeSectionComments) {
      root.com(this.commentGenerator.generateSectionComment('Header'));
      root.com('包含IDX文件的元数据，包括创建者信息和时间戳');
    }
    
    const headerElement = root.ele('foundation:Header', { 'xsi:type': 'foundation:EDMDHeader' });
    
    if (header.Description) {
      if (this.options.enableComments) {
        headerElement.com('设计描述和用途');
      }
      headerElement.ele('foundation:Description').txt(header.Description);
    }
    
    if (header.CreatorName) {
      if (this.options.enableComments) {
        headerElement.com('创建此文件的人员');
      }
      headerElement.ele('foundation:CreatorName').txt(header.CreatorName);
    }
    
    if (header.CreatorCompany) {
      if (this.options.enableComments) {
        headerElement.com('公司或组织信息');
      }
      headerElement.ele('foundation:CreatorCompany').txt(header.CreatorCompany);
    }
    
    if (header.CreatorSystem) {
      if (this.options.enableComments) {
        headerElement.com('生成此文件的软件系统');
      }
      headerElement.ele('foundation:CreatorSystem').txt(header.CreatorSystem);
    }
    
    if (this.options.enableComments) {
      headerElement.com('全局单位和时间戳 - 所有测量单位为毫米');
    }
    headerElement.ele('foundation:GlobalUnitLength').txt(header.GlobalUnitLength);
    headerElement.ele('foundation:CreationDateTime').txt(header.CreationDateTime);
    headerElement.ele('foundation:ModifiedDateTime').txt(header.ModifiedDateTime);
  }
  
  /**
   * 构建带注释的Body
   */
  private buildBodyWithComments(root: any, body: EDMDDataSetBody): void {
    if (this.options.enableComments && this.options.includeSectionComments) {
      root.com(this.commentGenerator.generateSectionComment('Body'));
      root.com('包含所有设计数据，包括几何、项目和形状');
    }
    
    const bodyElement = root.ele('foundation:Body', { 'xsi:type': 'foundation:EDMDDataSetBody' });
    
    // 构建几何元素（带注释）
    if (body.GeometricElements && body.GeometricElements.length > 0) {
      if (this.options.enableComments && this.options.includeSectionComments) {
        bodyElement.com(this.commentGenerator.generateSectionComment('Geometric Elements', body.GeometricElements.length));
        bodyElement.com('基本几何图元：点、线、圆等');
      }
      
      for (const element of body.GeometricElements) {
        this.buildGeometricElementWithComments(bodyElement, element);
      }
    }
    
    // 构建曲线集（带注释）
    if (body.CurveSet2Ds && body.CurveSet2Ds.length > 0) {
      if (this.options.enableComments && this.options.includeSectionComments) {
        bodyElement.com(this.commentGenerator.generateSectionComment('2D Curve Sets', body.CurveSet2Ds.length));
        bodyElement.com('2.5D曲线定义，带Z边界用于层表示');
      }
      
      for (const curveSet of body.CurveSet2Ds) {
        this.buildCurveSet2DWithComments(bodyElement, curveSet);
      }
    }
    
    // 构建形状元素（带注释）
    if (body.ShapeElements && body.ShapeElements.length > 0) {
      if (this.options.enableComments && this.options.includeSectionComments) {
        bodyElement.com(this.commentGenerator.generateSectionComment('Shape Elements', body.ShapeElements.length));
        bodyElement.com('引用几何图元的形状元素定义');
      }
      
      for (const shapeElement of body.ShapeElements) {
        this.buildShapeElementWithComments(bodyElement, shapeElement);
      }
    }
    
    // 构建所有项目（带注释）
    if (this.options.enableComments && this.options.includeSectionComments) {
      bodyElement.com(this.commentGenerator.generateSectionComment('Design Items', body.Items.length));
      bodyElement.com('PCB组件、层、孔和其他设计元素');
    }
    
    for (const item of body.Items) {
      this.buildItemWithComments(bodyElement, item);
    }
    
    // 构建所有形状（如果独立存储）
    if (body.Shapes && body.Shapes.length > 0) {
      if (this.options.enableComments && this.options.includeSectionComments) {
        bodyElement.com(this.commentGenerator.generateSectionComment('Shapes', body.Shapes.length));
        bodyElement.com('组合多个元素的复杂形状定义');
      }
      
      for (const shape of body.Shapes) {
        this.buildShapeWithComments(bodyElement, shape);
      }
    }
    
    // 构建3D模型（带注释）
    if (body.Models3D && body.Models3D.length > 0) {
      if (this.options.enableComments && this.options.includeSectionComments) {
        bodyElement.com(this.commentGenerator.generateSectionComment('3D Models', body.Models3D.length));
        bodyElement.com('三维模型表示');
      }
      
      for (const model of body.Models3D) {
        this.build3DModelWithComments(bodyElement, model);
      }
    }
  }
  
  /**
   * 构建带注释的项目
   */
  private buildItemWithComments(parent: any, item: EDMDItem): void {
    if (this.options.enableComments && this.options.includeItemComments) {
      // 根据项目类型生成专门的注释
      let itemComment: string;
      
      if (this.isComponentItem(item)) {
        itemComment = this.commentGenerator.generateComponentComment(item);
      } else if (this.isLayerItem(item)) {
        itemComment = this.commentGenerator.generateLayerComment(item);
      } else if (this.isHoleItem(item)) {
        itemComment = this.commentGenerator.generateHoleComment(item);
      } else if (this.isKeepoutItem(item)) {
        itemComment = this.commentGenerator.generateKeepoutComment(item);
      } else {
        itemComment = this.commentGenerator.generateItemComment(item);
      }
      
      parent.com(itemComment);
    }
    
    // 直接构建项目，不调用父类方法
    this.buildItemWithCommentsInternal(parent, item);
  }
  
  /**
   * 构建带注释的几何元素
   */
  private buildGeometricElementWithComments(parent: any, element: any): void {
    if (this.options.enableComments && this.options.includeGeometryComments) {
      const elementComment = this.commentGenerator.generateGeometricElementComment(element);
      parent.com(elementComment);
    }
    
    // 直接实现几何元素构建逻辑
    this.buildGeometricElementInternal(parent, element);
  }
  
  /**
   * 构建带注释的曲线集2D
   */
  private buildCurveSet2DWithComments(parent: any, curveSet: any): void {
    if (this.options.enableComments && this.options.includeGeometryComments) {
      const curveSetComment = this.commentGenerator.generateCurveSetComment(curveSet);
      parent.com(curveSetComment);
    }
    
    // 直接实现曲线集构建逻辑
    this.buildCurveSet2DInternal(parent, curveSet);
  }
  
  /**
   * 构建带注释的形状元素
   */
  private buildShapeElementWithComments(parent: any, shapeElement: any): void {
    if (this.options.enableComments && this.options.includeGeometryComments) {
      const shapeElementComment = this.commentGenerator.generateShapeElementComment(shapeElement);
      parent.com(shapeElementComment);
    }
    
    // 直接实现形状元素构建逻辑
    this.buildShapeElementInternal(parent, shapeElement);
  }
  
  /**
   * 构建带注释的形状
   */
  private buildShapeWithComments(parent: any, shape: any): void {
    if (this.options.enableComments && this.options.includeGeometryComments) {
      parent.com(`形状定义: ${shape.id || '未命名'}`);
    }
    
    // 直接实现形状构建逻辑（目前为空实现）
    // TODO: 实现形状构建逻辑
  }
  
  /**
   * 构建带注释的3D模型
   */
  private build3DModelWithComments(parent: any, model: any): void {
    if (this.options.enableComments && this.options.includeGeometryComments) {
      parent.com(`3D模型: ${model.id || '未命名'}`);
    }
    
    // 直接实现3D模型构建逻辑（目前为空实现）
    // TODO: 实现3D模型构建逻辑
  }
  
  /**
   * 构建带注释的ProcessInstruction
   */
  private buildProcessInstructionWithComments(root: any, instruction: EDMDProcessInstruction): void {
    if (this.options.enableComments && this.options.includeSectionComments) {
      root.com(this.commentGenerator.generateSectionComment('Process Instruction'));
      root.com(this.commentGenerator.generateProcessInstructionComment(instruction));
    }
    
    // 直接实现ProcessInstruction构建逻辑
    this.buildProcessInstructionInternal(root, instruction);
  }
  
  /**
   * 构建带注释的项目实例
   * 
   * 根据 IDX V4.5 协议，Item 引用应该使用元素文本内容，而不是 href 属性
   */
  private buildItemInstanceWithComments(parent: any, instance: any): void {
    if (this.options.enableComments) {
      parent.com(`项目 ${instance.Item} 的实例，带变换`);
    }
    
    const instanceElement = parent.ele('pdm:ItemInstance', { id: instance.id });
    
    // 移除 # 前缀（如果有）
    const itemId = instance.Item.startsWith('#') ? instance.Item.substring(1) : instance.Item;
    instanceElement.ele('pdm:Item').txt(itemId);
    
    // 构建实例名称
    const nameElement = instanceElement.ele('pdm:InstanceName');
    nameElement.ele('foundation:SystemScope').txt(instance.InstanceName.SystemScope);
    nameElement.ele('foundation:ObjectName').txt(instance.InstanceName.ObjectName);
    
    // 构建变换矩阵（带注释）
    if (instance.Transformation) {
      if (this.options.enableComments) {
        instanceElement.com(this.commentGenerator.generateTransformationComment(instance.Transformation));
      }
      this.buildTransformationInternal(instanceElement, instance.Transformation);
    }
    
    // 添加 Z 偏移（如果有）- 根据需求 13.5
    if (instance.zOffset !== undefined) {
      if (this.options.enableComments) {
        instanceElement.com(`Z 偏移: ${instance.zOffset}mm`);
      }
      instanceElement.ele('pdm:zOffset').txt(instance.zOffset.toString());
    }
  }
  
  /**
   * 判断是否为层项目
   */
  private isLayerItem(item: EDMDItem): boolean {
    return item.geometryType === 'LAYER_GENERIC' ||
           item.geometryType === 'LAYER_SOLDERMASK' ||
           item.geometryType === 'LAYER_SILKSCREEN' ||
           item.geometryType === 'LAYER_OTHERSIGNAL' ||
           (item.UserProperties?.some(p => p.Key?.ObjectName === 'LayerType') ?? false);
  }
  
  /**
   * 判断是否为孔项目
   * 
   * 根据 IDX V4.5 协议，VIA 不是标准几何类型，应该使用 HOLE_PLATED
   */
  private isHoleItem(item: EDMDItem): boolean {
    return item.geometryType === 'HOLE_PLATED' ||
           item.geometryType === 'HOLE_NON_PLATED' ||
           item.geometryType === 'FILLED_VIA' ||
           (item.UserProperties?.some(p => p.Key?.ObjectName === 'HoleType') ?? false);
  }
  
  /**
   * 判断是否为禁止区项目
   */
  private isKeepoutItem(item: EDMDItem): boolean {
    return item.geometryType === 'KEEPOUT_AREA_COMPONENT' ||
           item.geometryType === 'KEEPOUT_AREA_ROUTE' ||
           item.geometryType === 'KEEPOUT_AREA_VIA' ||
           (item.UserProperties?.some(p => p.Key?.ObjectName === 'KeepoutType') ?? false);
  }
  
  /**
   * 获取注释选项
   */
  getCommentOptions(): XMLWriterWithCommentsOptions {
    return { ...this.options };
  }
  
  /**
   * 设置注释选项
   */
  setCommentOptions(options: Partial<XMLWriterWithCommentsOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * 启用或禁用注释
   */
  setCommentsEnabled(enabled: boolean): void {
    this.options.enableComments = enabled;
  }
  
  // Internal implementation methods that replicate parent class functionality
  
  /**
   * 内部几何元素构建方法
   */
  private buildGeometricElementInternal(parent: any, element: any): void {
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
   * 内部曲线集2D构建方法
   * 
   * 根据需求 8.1-8.2，统一使用 d2:EDMDCurveSet2d（小写 d）类型命名
   */
  private buildCurveSet2DInternal(parent: any, curveSet: any): void {
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
   * 内部形状元素构建方法
   */
  private buildShapeElementInternal(parent: any, shapeElement: any): void {
    const shapeElementEl = parent.ele('foundation:ShapeElement', { id: shapeElement.id });
    
    shapeElementEl.ele('pdm:ShapeElementType').txt(shapeElement['pdm:ShapeElementType']);
    shapeElementEl.ele('pdm:Inverted').txt(shapeElement['pdm:Inverted']);
    shapeElementEl.ele('pdm:DefiningShape').txt(shapeElement['pdm:DefiningShape']);
  }
  
  /**
   * 内部ProcessInstruction构建方法
   * 
   * 根据 IDX V4.5 协议第 31 页，ProcessInstruction 应该使用 computational 命名空间
   * 不应包含 InstructionType 子元素，类型通过 xsi:type 属性定义
   */
  private buildProcessInstructionInternal(root: any, instruction: EDMDProcessInstruction): void {
    const instructionElement = root.ele('foundation:ProcessInstruction', { 
      'xsi:type': `computational:EDMDProcessInstruction${instruction.instructionType}`,
      id: instruction.id
    });
    
    // 根据协议专家反馈，移除 InstructionType 子元素
    // 指令类型已通过 xsi:type 属性定义，不需要重复的子元素
    
    // 添加Actor属性（如果有）
    if ((instruction as any).Actor) {
      instructionElement.ele('computational:Actor').txt((instruction as any).Actor);
    }
    
    // 添加Description属性（如果有）
    if ((instruction as any).Description) {
      instructionElement.ele('computational:Description').txt((instruction as any).Description);
    }
    
    // 根据指令类型添加特定内容
    if (instruction.instructionType === 'SendChanges') {
      // 添加变更相关内容
      // TODO: 实现变更指令的具体内容
    }
  }
  
  /**
   * 内部项目构建方法（带注释增强）
   */
  private buildItemWithCommentsInternal(parent: any, item: EDMDItem): void {
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
      if (this.options.enableComments) {
        itemElement.com('唯一标识符，包含版本和修订信息');
      }
      this.buildIdentifierInternal(itemElement, item.Identifier);
    }
    
    // 构建包名称
    if (item.PackageName) {
      if (this.options.enableComments) {
        itemElement.com(`封装: ${item.PackageName.ObjectName}`);
      }
      const packageElement = itemElement.ele('pdm:PackageName');
      packageElement.ele('foundation:SystemScope').txt(item.PackageName.SystemScope);
      packageElement.ele('foundation:ObjectName').txt(item.PackageName.ObjectName);
    }
    
    // 构建用户属性（带注释）
    if (item.UserProperties && item.UserProperties.length > 0) {
      if (this.options.enableComments) {
        itemElement.com(this.commentGenerator.generateUserPropertiesComment(item.UserProperties));
      }
      
      for (const prop of item.UserProperties) {
        this.buildUserPropertyInternal(itemElement, prop);
      }
    }
    
    // 构建项目实例（仅装配体）
    if (item.ItemType === ItemType.ASSEMBLY && item.ItemInstances) {
      if (this.options.enableComments) {
        itemElement.com(`装配体包含 ${item.ItemInstances.length} 个项目实例`);
      }
      
      for (const instance of item.ItemInstances) {
        this.buildItemInstanceWithComments(itemElement, instance);
      }
    }
    
    // 构建形状引用
    if (item.Shape) {
      if (this.options.enableComments) {
        itemElement.com('形状引用定义物理几何');
      }
      
      if (typeof item.Shape === 'string') {
        // 根据 IDX V4.5 协议，形状引用应该使用元素文本内容，而不是 href 属性
        // 移除 # 前缀（如果有）
        const shapeId = item.Shape.startsWith('#') ? item.Shape.substring(1) : item.Shape;
        itemElement.ele('pdm:Shape').txt(shapeId);
      } else {
        console.warn(`项目${item.id}包含复杂形状对象，暂时跳过序列化`);
      }
    }
    
    // 构建基线标记 - 根据需求 10.1-10.4 使用正确格式
    if (item.BaseLine !== undefined) {
      if (this.options.enableComments) {
        itemElement.com('版本控制的基线标记');
      }
      // 使用 <pdm:BaseLine>true</pdm:BaseLine> 格式，注意大小写
      itemElement.ele('pdm:BaseLine').txt(item.BaseLine.toString());
    }
    
    // 构建装配到名称
    if (item.AssembleToName) {
      if (this.options.enableComments) {
        itemElement.com(`装配到: ${item.AssembleToName}`);
      }
      itemElement.ele('pdm:AssembleToName').txt(item.AssembleToName);
    }
    
    // 构建参考名称 - 根据需求 13.4
    if (item.ReferenceName) {
      if (this.options.enableComments) {
        itemElement.com(`参考名称: ${item.ReferenceName}`);
      }
      itemElement.ele('pdm:ReferenceName').txt(item.ReferenceName);
    }
  }
  
  /**
   * 内部标识符构建方法
   */
  private buildIdentifierInternal(parent: any, identifier: any): void {
    const idElement = parent.ele('pdm:Identifier', { 'xsi:type': 'foundation:EDMDIdentifier' });
    
    idElement.ele('foundation:SystemScope').txt(identifier.SystemScope);
    idElement.ele('foundation:Number').txt(identifier.Number);
    idElement.ele('foundation:Version').txt(identifier.Version.toString());
    idElement.ele('foundation:Revision').txt(identifier.Revision.toString());
    idElement.ele('foundation:Sequence').txt(identifier.Sequence.toString());
  }
  
  /**
   * 内部用户属性构建方法
   * 
   * 根据 IDX V4.5 协议规范，用户属性应该使用 foundation:UserProperty 元素名称，
   * 配合 xsi:type="property:EDMDUserSimpleProperty" 类型声明
   */
  private buildUserPropertyInternal(parent: any, prop: any): void {
    const propElement = parent.ele('foundation:UserProperty', {
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
   * 内部变换矩阵构建方法
   * 
   * 根据 IDX V4.5 协议第 7.1-7.4 需求：
   * - 不使用 xsi:type 属性
   * - 添加 TransformationType 元素
   * - 使用 foundation:Value 包装 tx、ty、tz
   */
  private buildTransformationInternal(parent: any, transformation: any): void {
    // 使用 TransformationBuilder 构建正确格式的变换矩阵
    if (transformation.TransformationType === 'd2') {
      this.transformationBuilder.build2DTransformation(parent, transformation);
    } else if (transformation.TransformationType === 'd3') {
      this.transformationBuilder.build3DTransformation(parent, transformation);
    } else {
      console.warn(`Unknown transformation type: ${transformation.TransformationType}`);
    }
  }
}