// examples/export-with-layers.ts
import { IDXExporter, LayerPurpose } from '../src/exporter';

async function exportMultiLayerBoard() {
  const exporter = new IDXExporter({
    geometry: { useSimplified: true, defaultUnit: GlobalUnit.UNIT_MM },
    collaboration: { includeLayerStackup: true }
  });

  const boardData = {
    board: {
      // ... 板轮廓数据
    },
    layers: [
      {
        id: 'TOP_SOLDERMASK',
        name: 'Top Soldermask',
        type: LayerPurpose.SOLDERMASK,
        thickness: 0.02,
        material: 'LPI'
      },
      {
        id: 'TOP_COPPER',
        name: 'Top Copper',
        type: LayerPurpose.OTHERSIGNAL,
        thickness: 0.035,
        copperWeight: 1
      },
      {
        id: 'DIEL_1',
        name: 'Dielectric 1',
        type: LayerPurpose.DIELECTRIC,
        thickness: 0.1,
        dielectricConstant: 4.3,
        material: 'FR4'
      }
      // ... 更多层
    ],
    layerStackup: {
      id: 'MAIN_STACKUP',
      name: '4-Layer Stackup',
      layers: [
        { layerId: 'TOP_SOLDERMASK', position: 1, thickness: 0.02 },
        { layerId: 'TOP_COPPER', position: 2, thickness: 0.035 },
        { layerId: 'DIEL_1', position: 3, thickness: 0.1 },
        // ... 更多层
      ]
    },
    // ... 组件、孔等数据
  };

  const result = await exporter.export(boardData);
  // 处理结果...
}