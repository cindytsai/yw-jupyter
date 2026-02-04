# yw-jupyter

A JupyterLab extension for visualizing notebook cells using YesWorkflow.

## Install

### PyPI

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
