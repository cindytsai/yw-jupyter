# yw-jupyter

A JupyterLab extension for visualizing notebook cells using YesWorkflow.

![demo-v0.1](./doc/static/yw-jupyter-demo-v0.1.gif)

## Install

### PyPI

```bash
pip install yw-jupyter
```

### Install from source

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

> [!WARNING]
> Avoid installing from source unless you need the latest features or development mode.

