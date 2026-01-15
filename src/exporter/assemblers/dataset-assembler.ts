import { EDMDDataSetBody } from "../../types/core";
import { BoardData } from "../builders/board-builder";

// src/exporter/assemblers/dataset-assembler.ts
export class DatasetAssembler {
  private builders: BuilderRegistry;
  private config: AssemblerConfig;

  /**
   * 组装基线消息的Body
   */
  async assembleBaselineBody(boardData: BoardData): Promise<EDMDDataSetBody> {
    const body: EDMDDataSetBody = {
      Items: [],
      Shapes: [],
      Models3D: []
    };

    // 1. 构建板轮廓
    const boardBuilder = this.builders.get('board');
    const boardItem = await boardBuilder.build(boardData);
    body.Items.push(boardItem);

    // 2. 构建层系统（如果有多层）
    if (boardData.layers && boardData.layers.length > 0) {
      const layerSystem = await this.assembleLayerSystem(boardData);
      body.Items.push(...layerSystem.items);
      body.Shapes.push(...layerSystem.shapes);
    }

    // 3. 构建组件
    const componentBuilder = this.builders.get('component');
    for (const component of boardData.components) {
      const componentItem = await componentBuilder.build(component);
      body.Items.push(componentItem);
      
      // 收集组件的形状和模型
      this.collectComponentArtifacts(componentItem, body);
    }

    // 4. 构建孔和切口
    for (const hole of boardData.holes) {
      const holeBuilder = this.builders.get(hole.plated ? 'plated-hole' : 'non-plated-hole');
      const holeItem = await holeBuilder.build(hole);
      body.Items.push(holeItem);
    }

    // 5. 构建保持区域
    for (const keepout of boardData.keepouts) {
      const keepoutBuilder = this.builders.get('keepout');
      const keepoutItem = await keepoutBuilder.build(keepout);
      body.Items.push(keepoutItem);
    }

    return body;
  }

  /**
   * 组装层系统
   */
  private async assembleLayerSystem(boardData: BoardData): Promise<LayerSystemAssembly> {
    const result: LayerSystemAssembly = {
      items: [],
      shapes: []
    };

    // 构建物理层
    for (const layer of boardData.layers) {
      const layerBuilder = this.builders.get('layer');
      const layerItem = await layerBuilder.build(layer);
      result.items.push(layerItem);
    }

    // 构建层堆叠
    if (boardData.layerStackup) {
      const stackupBuilder = this.builders.get('stackup');
      const stackupItem = await stackupBuilder.build(boardData.layerStackup);
      result.items.push(stackupItem);
    }

    // 构建层区域（用于柔性板）
    if (boardData.layerZones && boardData.layerZones.length > 0) {
      for (const zone of boardData.layerZones) {
        const zoneBuilder = this.builders.get('layer-zone');
        const zoneItem = await zoneBuilder.build(zone);
        result.items.push(zoneItem);
      }
    }

    return result;
  }
}