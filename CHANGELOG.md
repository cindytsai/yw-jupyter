# Changelog

## v1.0.0 - Dynamic Analysis and Static Analysis Graph Visualization

### New Features

The **graph** reflects the current Python execution state, including both executed cells and those that have not yet been run.
> [!IMPORTANT]
> A notebook cell can correspond to one or more nodes---if a cell is executed multiple times or subsequently edited, multiple nodes should be created to faithfully represent each execution state.
>
> **In the current prototype, users can mitigate this by duplicating the cell before editing.**

- Added **dynamic analysis** support via [`ipyflow`](https://github.com/ipyflow/ipyflow): track actual cell execution dependencies at runtime for more accurate dependency edges.
- Added **upstream selection**: selecting a node highlights all its upstream nodes and edges.
- Added **cell duplication**: duplicate notebook cells directly from the graph node.
- Added **export**: copy the code that reproduces the results via the export button.

## v0.1.0 - Initial Release

- Initial release of `yw-jupyter` extension.
- Provided installation instructions for both PyPI and source installation.
- Added "YesWorkflow" tab to JupyterLab sidebar.
- Implemented graph visualization of notebook cells using [`yw-core`](https://github.com/CIRSS/yw-core).
- Notebook cells and graph nodes are in sync:
  - Selecting a cell highlights the corresponding node in the graph and vice versa.
  - Editing cells updates the contents in the node in real-time and vice versa.
