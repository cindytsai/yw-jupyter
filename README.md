# yw-jupyter

A JupyterLab extension for visualizing notebook cells using YesWorkflow.

<iframe id="kmsembed-1_nju64d5x" width="640" height="394" src="https://mediaspace.illinois.edu/embed/secure/iframe/entryId/1_nju64d5x/uiConfId/55779922/st/0" class="kmsembed" allowfullscreen webkitallowfullscreen mozAllowFullScreen allow="autoplay *; fullscreen *; encrypted-media *" referrerPolicy="no-referrer-when-downgrade" sandbox="allow-downloads allow-forms allow-same-origin allow-scripts allow-top-navigation allow-pointer-lock allow-popups allow-modals allow-orientation-lock allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation" frameborder="0" title="yw-jupyter-demo-v0.1"></iframe>

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

