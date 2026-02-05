# yw-jupyter

A JupyterLab extension build upon ReactFlow for visualizing notebook cells using YesWorkflow.

- The extension adds a "YesWorkflow" tab to the JupyterLab sidebar and cell toolbar.
- Clicking the "YesWorkflow" tab opens the YesWorkflow panel.
- The panel displays a graph representation of the current notebook's cells and their relationships based on [`yw-core`](https://github.com/CIRSS/yw-core).
- Notebook cells and graph nodes are in sync:
  - Selecting a cell highlights the corresponding node in the graph and vice versa.
  - Editing cells updates the contents in the node in real-time and vice versa.

![demo-v0.1](./doc/static/yw-jupyter-demo-v0.1.gif)

## Install

### PyPI

> [!NOTE]
> Recommended installation method.

```bash
pip install yw-jupyter
```

### Install from source

> [!WARNING]
> Avoid installing from source unless you need the latest features or development mode.

- Requirements:
  - `JupyterLab` >= 4.0.0
  - `yw-core` >= 0.1.0, < 1.0.0

```bash
git clone https://github.com/CIRSS/yw-jupyter.git yw-jupyter
cd yw-jupyter
jlpm install
jlpm build:lib
jlpm build:prod
jupyter labextension develop . --overwrite
```

## Troubleshooting

Make sure we see `yw-jupyter` is enabled in JupyterLab extensions list:

```bash
>>> jupyter labextension list
JupyterLab v4.5.3
~/Documents/GitHub/yw-jupyter/.venv/share/jupyter/labextensions
        jupyterlab_pygments v0.3.0 enabled OK (python, jupyterlab_pygments)
        yw-jupyter v0.1.0 enabled OK
```

## Known Issues and Future Work

- Code block's cursor in graph node not matching the actual cursor position.
- Currently, support only static analysis of notebook cells using [`yw-core`](https://github.com/CIRSS/yw-core). Supporting dynamic analysis via runtime provenance capture is planned for future releases.
- Bugs when multiple notebooks and yw-jupyter extensions are open in JupyterLab simultaneously.
