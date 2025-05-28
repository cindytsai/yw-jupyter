import { ReactWidget } from '@jupyterlab/ui-components';

import React, { useState } from 'react';

interface CounterComponentProps {
  notebookID?: string;
}

/**
 * React component for a counter.
 *
 * @returns The React component
 */
const CounterComponent = ({
  notebookID
}: CounterComponentProps): JSX.Element => {
  const [counter, setCounter] = useState(0);

  return (
    <div>
      <p>You clicked {counter} times!</p>
      <p>Notebook ID: {notebookID}</p>
      <button
        onClick={(): void => {
          setCounter(counter + 1);
        }}
      >
        Increment
      </button>
    </div>
  );
};

/**
 * A Counter Lumino Widget that wraps a CounterComponent.
 */
export class YWWidget extends ReactWidget {
  /**
   * Constructs a new CounterWidget.
   */
  readonly notebookID: string;

  constructor(notebookID: string) {
    super();
    this.addClass('jp-react-widget');
    this.notebookID = notebookID;
  }

  render(): JSX.Element {
    return <CounterComponent notebookID={this.notebookID} />;
  }
}
