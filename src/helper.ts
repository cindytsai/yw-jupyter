import { INotebookTracker } from '@jupyterlab/notebook';

let _tracker: INotebookTracker | null = null;

export const setNotebookTracker = (tracker: INotebookTracker) => {
  _tracker = tracker;
  console.log('[setNotebookTracker] ', _tracker);
};

export const getNotebookAndCellById = (notebookID: string, cellID: string) => {
  const notebookPanel =
    _tracker?.find(panel => panel.id === notebookID) ?? null;
  if (notebookPanel) {
    const cell = notebookPanel.content.widgets.find(
      cell => cell.model.id === cellID
    );
    if (cell) {
      return { notebookPanel: notebookPanel, cell: cell };
    } else {
      return { notebookPanel: notebookPanel, cell: undefined };
    }
  } else {
    return { notebookPanel: null, cell: undefined };
  }
};
