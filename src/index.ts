import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Notification } from '@jupyterlab/apputils';

import { LabIcon } from '@jupyterlab/ui-components';

import { YWWidget } from './ywwidget';

import yesworkflowSvgStr from '../style/icons/yesworkflow.svg';
import { setNotebookTracker } from './helper';

function activate(
  app: JupyterFrontEnd,
  notebookTracker: INotebookTracker
): void {
  // create icon for YesWorkflow
  const ywIcon = new LabIcon({
    name: 'jupyter-yw-workflow:icon',
    svgstr: yesworkflowSvgStr
  });

  // create widget tracker for YWWidget
  const ywWidgetTracker = new WidgetTracker<MainAreaWidget<YWWidget>>({
    namespace: 'yesworkflow'
  });

  // all yw command
  const ywCommandOpen: string = 'yw-jupyter:open';
  const ywCommandGoToNode: string = 'yw-jupyter:go-to-node';
  const ywCommandExport: string = 'yw-jupyter:export-node';

  function createYWWidget(
    notebook: NotebookPanel,
    app: JupyterFrontEnd,
    widget: MainAreaWidget<YWWidget> | undefined
  ) {
    const content = new YWWidget(notebook, app);
    widget = new MainAreaWidget({ content });
    widget.id = 'ywwidget-' + notebook.id;
    widget.title.label = 'YW: ' + notebook.title.label;
    widget.title.icon = ywIcon;
    widget.title.closable = true;
    return widget;
  }

  // register yw open command
  app.commands.addCommand(ywCommandOpen, {
    label: 'YesWorkflow: Open',
    caption: 'Open YesWorkflow visualization',
    icon: ywIcon,
    execute: (args: any) => {
      // get current notebook
      const notebook: NotebookPanel | null = notebookTracker.currentWidget;
      if (!notebook) {
        console.log('No notebook is currently open.');
        return;
      }

      console.log('Notebook: ', notebook);

      // create YWWidget
      let widget: MainAreaWidget<YWWidget> | undefined = ywWidgetTracker.find(
        widget => {
          return widget.id === 'ywwidget-' + notebook?.id;
        }
      );
      if (widget === undefined) {
        widget = createYWWidget(notebook, app, widget);
        ywWidgetTracker.add(widget).catch(error => {
          console.error('Unable to add ywwidget to tracker: ' + error);
        });
      }

      // attach YWWidget to main area
      if (!widget.isAttached) {
        app.shell.add(widget, 'main', { mode: 'split-right' });
      }
    }
  });

  // register notebook tracker
  setNotebookTracker(notebookTracker);

  // register yw go to node command
  app.commands.addCommand(ywCommandGoToNode, {
    label: 'YesWorkflow: Go to Node',
    caption: 'Go to code cell node in YesWorkflow visualization',
    icon: ywIcon,
    isVisible: () => notebookTracker.activeCell?.model.type === 'code',
    execute: () => {
      const ywWidgetID = 'ywwidget-' + notebookTracker.currentWidget?.id;
      let ywWidget = ywWidgetTracker.find(widget => widget.id === ywWidgetID);
      if (ywWidget === undefined && notebookTracker.currentWidget) {
        ywWidget = createYWWidget(notebookTracker.currentWidget, app, ywWidget);
        ywWidgetTracker.add(ywWidget).catch(error => {
          console.error('Unable to add ywwidget to tracker: ' + error);
        });
      }
      if (ywWidget !== undefined && !ywWidget?.isAttached) {
        app.shell.add(ywWidget, 'main', { mode: 'split-right' });
      }
      const cellIndex = notebookTracker.currentWidget?.content.activeCellIndex;
      if (typeof cellIndex === 'number') {
        const cellID =
          notebookTracker.currentWidget?.content.widgets[cellIndex].model.id;
        if (typeof cellID === 'string') {
          ywWidget?.content.focusYWNode(cellID);
        }
      }
    }
  });

  // register yw export code command
  app.commands.addCommand(ywCommandExport, {
    label: 'YesWorkflow: Export Node',
    caption: 'Export reproducible code of a node in YesWorkflow visualization',
    execute: async (args: any) => {
      const code = args['code'] as string | string[];
      await navigator.clipboard.writeText(
        code instanceof Array ? code.join('\n') : code
      );
      Notification.success('Code copied to clipboard!', { autoClose: 3000 });
    }
  });
}

/**
 * Initialization data for the yw-jupyter extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'yw-jupyter:plugin',
  description:
    'A JupyterLab extension for visualizing notebook cells using YesWorkflow.',
  autoStart: true,
  requires: [INotebookTracker],
  activate: activate
};

export default plugin;
