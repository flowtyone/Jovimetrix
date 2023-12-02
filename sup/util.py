"""
     ██  ██████  ██    ██ ██ ███    ███ ███████ ████████ ██████  ██ ██   ██ 
     ██ ██    ██ ██    ██ ██ ████  ████ ██         ██    ██   ██ ██  ██ ██  
     ██ ██    ██ ██    ██ ██ ██ ████ ██ █████      ██    ██████  ██   ███  
██   ██ ██    ██  ██  ██  ██ ██  ██  ██ ██         ██    ██   ██ ██  ██ ██ 
 █████   ██████    ████   ██ ██      ██ ███████    ██    ██   ██ ██ ██   ██ 

               Procedural, Compositing & Video Manipulation Nodes
                    http://www.github.com/amorano/jovimetrix
"""


import os
import sys
import math
from contextlib import contextmanager
from typing import Any, Generator

from PIL import Image
from PIL.PngImagePlugin import PngInfo

# =============================================================================
# === "LOGGER" ===
# =============================================================================
JOV_LOG = 0
try: JOV_LOG = int(os.getenv("JOV_LOG"))
except: pass

def logerr(msg: str) -> None:
    print(f"\033[48;2;135;27;81;93m[JOV]\033[0m {msg}")

def logwarn(msg: str) -> None:
    if JOV_LOG > 0:
        print(f"\033[48;2;189;135;54;93m[JOV]\033[0m {msg}")

def loginfo(msg: str) -> None:
    if JOV_LOG > 1:
        print(f"\033[48;2;54;135;27;93m[JOV]\033[0m {msg}")

def logdebug(msg: str) -> None:
    if JOV_LOG > 2:
        print(f"\033[48;2;35;87;181;93m[JOV]\033[0m {msg}")

@contextmanager
def suppress_std() -> Generator[None, Any, None]:
    with open(os.devnull, "w") as devnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = devnull
        sys.stderr = devnull

        try:
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

# =============================================================================

def mergePNGMeta(root: str, target: str) -> None:
    for r, _, fs in os.walk(root):
        for f in fs:
            f, ext = os.path.splitext(f)
            if ext != '.json':
                continue

            img = f"{r}/{f}.png"
            if not os.path.isfile(img):
                continue

            fn = f"{r}/{f}.json"
            with open(fn, "r", encoding="utf-8") as out:
                data = out.read()

            out = f"{target}/{f}.png"
            with Image.open(img) as image:
                metadata = PngInfo()
                for i in image.text:
                    if i == 'workflow':
                        continue
                    metadata.add_text(i, str(image.text[i]))
                metadata.add_text("workflow", data.encode('utf-8'))
                image.save(out, pnginfo=metadata)
                loginfo(f"wrote {f} ==> {out}")

def gridMake(data: list[object]) -> list[object]:
    size = len(data)
    grid = int(math.sqrt(size))
    if grid * grid < size:
        grid += 1
    if grid < 1:
        return [], 0, 0

    rows = size // grid
    if size % grid != 0:
        rows += 1

    ret = []
    cols = 0
    for j in range(rows):
        end = min((j + 1) * grid, len(data))
        cols = max(cols, end - j * grid)
        d = [data[i] for i in range(j * grid, end)]
        ret.append(d)
    return ret, cols, rows

if __name__ == "__main__":
    mergePNGMeta('../../pysssss-workflows', './flow')
