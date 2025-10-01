Project: FACS_HMM and Supporting Utilities

Overview
- This repository contains a Jupyter notebook (FACS_HMM.ipynb) that demonstrates extracting FACS Action Units with py-feat, training a Poisson HMM, visualizing its transition structure, and animating results.
- The Python package graphviz is used to build diagrams in Python, but rendering to images (PDF/PNG/SVG) requires the system Graphviz executables, particularly the dot binary.

System Graphviz Requirement (dot)
If you see the error: ExecutableNotFound: failed to execute 'dot' or a message stating "Graphviz 'dot' executable not found on PATH", install system Graphviz:
- Linux (Debian/Ubuntu):
  sudo apt-get update && sudo apt-get install -y graphviz
- macOS (Homebrew):
  brew install graphviz
- Windows:
  1) Download the installer from https://graphviz.org/download/
  2) Install Graphviz and add its bin directory (e.g., C:\Program Files\Graphviz\bin) to your PATH

Notes
- The Python wrapper package graphviz (listed in requirements.txt) is not the same as the system Graphviz executables. You need both to render diagrams locally from the notebook.
- The notebook already detects when dot is missing and will avoid raising exceptions. In that case, it prints installation guidance and the DOT source so you can render it elsewhere.

Quick DOT Smoke Test in Python
This is similar to what the notebook runs early on:

import shutil, graphviz
from IPython.display import display

G = graphviz.Digraph(); G.node('a'); G.node('b'); G.edge('a','b')
if shutil.which('dot'):
    display(G)  # renders if system Graphviz is installed
else:
    print("Graphviz 'dot' executable not found on PATH. Install system Graphviz to render diagrams.")
    print("Linux (Debian/Ubuntu): sudo apt-get install -y graphviz")
    print("macOS: brew install graphviz")
    print("Windows: Install Graphviz and add its bin directory to PATH")
    print("DOT source (you can paste this into an online Graphviz viewer):")
    print(G.source)

Online Rendering (Fallback)
If you cannot install system Graphviz, copy the printed DOT source into an online Graphviz viewer, for example:
- https://dreampuf.github.io/GraphvizOnline
- https://edotor.net

Example DOT source you can paste:

digraph {
    a
    b
    a -> b
}

Environment and Dependencies
- Use the provided .venv for this project. The notebook’s first cells verify the active interpreter and install needed Python packages into the kernel:
  - py-feat, hmmlearn, tqdm, graphviz, celluloid
- If imports fail, ensure you are using the project’s virtual environment in Jupyter (Kernel → Change Kernel → Python (.venv)).

Troubleshooting
- If py-feat import fails due to SciPy deprecations or lib2to3, the notebook includes small compatibility shims to unblock execution on newer Python/SciPy versions.
- HMM training expects non-negative integer observations; the notebook’s data-prep cells ensure this for the PoissonHMM.

