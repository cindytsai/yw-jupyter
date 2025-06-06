import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { LabIcon } from '@jupyterlab/ui-components';

import { requestAPI } from './handler';

import { YWWidget } from './ywwidget';

import yesworkflowSvgStr from '../style/icons/yesworkflow.svg';

function activate(
  app: JupyterFrontEnd,
  notebookTracker: INotebookTracker
): void {
  // Dev: make sure our extension and server are working
  console.log('JupyterLab extension jupyter-yesworkflow is activated!');

  requestAPI<any>('get-example')
    .then(data => {
      console.log(data);
    })
    .catch(reason => {
      console.error(
        `The jupyter_yesworkflow server extension appears to be missing.\n${reason}`
      );
    });

  // create icon for YesWorkflow
  const ywIcon = new LabIcon({
    name: 'jupyter-yw-workflow:icon',
    svgstr: yesworkflowSvgStr
  });

  // create widget tracker for YWWidget
  const ywWidgetTracker = new WidgetTracker<MainAreaWidget<YWWidget>>({
    namespace: 'yesworkflow'
  });

  // registry yw command
  const command: string = 'jupyter-yesworkflow:open';
  app.commands.addCommand(command, {
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
        const content = new YWWidget(notebook);
        widget = new MainAreaWidget({ content });
        widget.id = 'ywwidget-' + notebook.id;
        widget.title.label = 'YW: ' + notebook.title.label;
        widget.title.icon = ywIcon;
        widget.title.closable = true;

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
}

/**
 * Initialization data for the jupyter-yesworkflow extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-yesworkflow:plugin',
  description: 'A JupyterLab extension for visualizing YesWorkflow.',
  autoStart: true,
  requires: [INotebookTracker],
  activate: activate
};

export default plugin;
