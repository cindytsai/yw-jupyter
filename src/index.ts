import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

/**
 * Initialization data for the jupyter-yesworkflow extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-yesworkflow:plugin',
  description: 'A JupyterLab extension for visualizing YesWorkflow.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
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
  }
};

export default plugin;
