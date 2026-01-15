import { create } from "domain";
import { XMLBuilder } from "fast-xml-parser";
import { XMLWriterOptions } from "../..";
import { EDMDDataSet, EDMDHeader, EDMDDataSetBody, EDMDItem, ItemType, EDMDIdentifier } from "../../types/core";

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
    const root = this.createRootElement(dataset);
    
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

    const xml = root.end({
      prettyPrint: this.prettyPrint,
      indent: '  ',
      newline: '\n'
    });

    return `<?xml version="1.0" encoding="${this.encoding}"?>\n${xml}`;
  }

  /**
   * 构建根元素
   */
  private createRootElement(dataset: EDMDDataSet): XMLBuilder {
    const root = create({ version: '1.0', encoding: this.encoding })
      .ele('foundation:EDMDDataSet', this.namespaces);

    // 添加自定义命名空间
    if (dataset.namespaces) {
      Object.entries(dataset.namespaces).forEach(([key, value]) => {
        root.att(key, value);
      });
    }

    return root;
  }

  /**
   * 构建Header
   */
  private buildHeader(root: XMLBuilder, header: EDMDHeader): void {
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
  private buildBody(root: XMLBuilder, body: EDMDDataSetBody): void {
    const bodyElement = root.ele('foundation:Body', { 'xsi:type': 'foundation:EDMDDataSetBody' });
    
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
  private buildItem(parent: XMLBuilder, item: EDMDItem): void {
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
        // 内联形状 - 实际中可能复杂，这里简化处理
        itemElement.ele('pdm:Shape').txt('INLINE_SHAPE');
      }
    }
  }

  /**
   * 构建EDMDIdentifier
   */
  private buildIdentifier(parent: XMLBuilder, identifier: EDMDIdentifier): void {
    const idElement = parent.ele('pdm:Identifier', { 'xsi:type': 'foundation:EDMDIdentifier' });
    
    idElement.ele('foundation:SystemScope').txt(identifier.SystemScope);
    idElement.ele('foundation:Number').txt(identifier.Number);
    idElement.ele('foundation:Version').txt(identifier.Version.toString());
    idElement.ele('foundation:Revision').txt(identifier.Revision.toString());
    idElement.ele('foundation:Sequence').txt(identifier.Sequence.toString());
  }
}