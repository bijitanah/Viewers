import OHIF from '@ohif/core';
import cornerstone from 'cornerstone-core';
import csTools from 'cornerstone-tools';
import initCornerstoneTools from './initCornerstoneTools.js';
import queryString from 'query-string';
import { SimpleDialog } from '@ohif/ui';

function fallbackMetaDataProvider(type, imageId) {
  if (!imageId.includes('wado?requestType=WADO')) {
    return;
  }

  // If you call for an WADO-URI imageId and get no
  // metadata, try reformatting to WADO-RS imageId
  const qs = queryString.parse(imageId);
  const wadoRoot = window.store.getState().servers.servers[0].wadoRoot;
  const wadoRsImageId = `wadors:${wadoRoot}/studies/${qs.studyUID}/series/${
    qs.seriesUID
  }/instances/${qs.objectUID}/frames/${qs.frame || 1}`;

  return cornerstone.metaData.get(type, wadoRsImageId);
}

// Add this fallback provider with a low priority so it is handled last
cornerstone.metaData.addProvider(fallbackMetaDataProvider, -1);

/**
 *
 * @param {object} configuration
 * @param {Object|Array} configuration.csToolsConfig
 */
export default function init({ servicesManager, configuration = {} }) {
  const { UIDialogService } = servicesManager.services;
  const callInputDialog = (data, event, callback) => {
    let dialogId = UIDialogService.create({
      content: SimpleDialog.InputDialog,
      defaultPosition: {
        x: (event && event.currentPoints.canvas.x) || 0,
        y: (event && event.currentPoints.canvas.y) || 0,
      },
      showOverlay: true,
      contentProps: {
        title: 'Enter your annotation',
        label: 'New label',
        measurementData: data ? { description: data.text } : {},
        onClose: () => UIDialogService.dismiss({ id: dialogId }),
        onSubmit: value => {
          callback(value);
          UIDialogService.dismiss({ id: dialogId });
        },
      },
    });
  };

  const { csToolsConfig } = configuration;
  const { StackManager } = OHIF.utils;
  const metadataProvider = new OHIF.cornerstone.MetadataProvider();

  // ~~ Set our MetadataProvider
  cornerstone.metaData.addProvider(
    metadataProvider.provider.bind(metadataProvider)
  );

  StackManager.setMetadataProvider(metadataProvider);

  // ~~
  const defaultCsToolsConfig = csToolsConfig || {
    globalToolSyncEnabled: true,
    showSVGCursors: true,
    autoResizeViewports: false,
  };

  initCornerstoneTools(defaultCsToolsConfig);

  // ~~ Toooools 🙌
  const {
    PanTool,
    ZoomTool,
    WwwcTool,
    MagnifyTool,
    StackScrollTool,
    StackScrollMouseWheelTool,
    // Touch
    PanMultiTouchTool,
    ZoomTouchPinchTool,
    // Annotations
    EraserTool,
    BidirectionalTool,
    LengthTool,
    AngleTool,
    FreehandRoiTool,
    EllipticalRoiTool,
    DragProbeTool,
    RectangleRoiTool,
    // Segmentation
    BrushTool,
  } = csTools;
  const tools = [
    PanTool,
    ZoomTool,
    WwwcTool,
    MagnifyTool,
    StackScrollTool,
    StackScrollMouseWheelTool,
    // Touch
    PanMultiTouchTool,
    ZoomTouchPinchTool,
    // Annotations
    EraserTool,
    BidirectionalTool,
    LengthTool,
    AngleTool,
    FreehandRoiTool,
    EllipticalRoiTool,
    DragProbeTool,
    RectangleRoiTool,
    // Segmentation
    BrushTool,
  ];

  tools.forEach(tool => csTools.addTool(tool));

  csTools.addTool(csTools.ArrowAnnotateTool, {
    configuration: {
      getTextCallback: (callback, eventDetails) =>
        callInputDialog(null, eventDetails, callback),
      changeTextCallback: (data, eventDetails, callback) =>
        callInputDialog(data, eventDetails, callback),
    },
  });

  csTools.setToolActive('Pan', { mouseButtonMask: 4 });
  csTools.setToolActive('Zoom', { mouseButtonMask: 2 });
  csTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
  csTools.setToolActive('StackScrollMouseWheel', {}); // TODO: Empty options should not be required
  csTools.setToolActive('PanMultiTouch', { pointers: 2 }); // TODO: Better error if no options
  csTools.setToolActive('ZoomTouchPinch', {});
}
