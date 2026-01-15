// examples/export-with-layers.ts
import { IDXExporter, GlobalUnit } from '../src/exporter';

async function exportMultiLayerBoard() {
  const exporter = new IDXExporter({
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 6
    },
    collaboration: { 
      creatorSystem: 'MyECADSystem',
      creatorCompany: 'MyCompany',
      includeNonCollaborative: false,
      includeLayerStackup: true 
    }
  });

  const boardData = {
    id: 'MULTILAYER_BOARD',
    name: 'Multi-Layer Board',
    outline: {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 80 },
        { x: 0, y: 80 }
      ],
      thickness: 1.6
    },
    layers: [
      {
        id: 'TOP_SOLDERMASK',
        name: 'Top Soldermask',
        type: 'SOLDERMASK',
        thickness: 0.02,
        material: 'LPI'
      },
      {
        id: 'TOP_COPPER',
        name: 'Top Copper',
        type: 'OTHERSIGNAL',
        thickness: 0.035,
        copperWeight: 1
      },
      {
        id: 'DIEL_1',
        name: 'Dielectric 1',
        type: 'DIELECTRIC',
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

  const result = await exporter.export({ board: boardData });
  
  if (result.success) {
    console.log('✅ 多层板导出成功！');
    console.log(`📊 统计信息:`);
    console.log(`   项目总数: ${result.statistics.totalItems}`);
    console.log(`   文件大小: ${result.statistics.fileSize} 字节`);
  } else {
    console.error('❌ 导出失败:', result.issues);
  }
}

// 运行示例
exportMultiLayerBoard().catch(console.error);