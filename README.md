# jupyter-yesworkflow

A JupyterLab extension for visualizing YesWorkflow.


This extension is composed of a Python package named `jupyter_yesworkflow`
for the server extension and a NPM package named `jupyter-yesworkflow`
for the frontend extension.

## Install and Requirements

#### Requirements
- `JupyterLab` >= 4.0.0
- `yw-core` >= 0.1.0, < 1.0.0

#### Install

Install from source code:
```bash
git clone https://github.com/cindytsai/jupyter-yesworkflow.git
cd jupyter-yesworkflow
jlpm run build
pip install .
```

#### Uninstall

```bash
pip uninstall jupyter-yesworkflow
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```
