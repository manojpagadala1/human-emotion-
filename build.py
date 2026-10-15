import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"

subprocess.run(["npm", "ci"], cwd=FRONTEND, check=True)
subprocess.run(["npm", "run", "build"], cwd=FRONTEND, check=True)
shutil.copytree(FRONTEND / "dist", ROOT / "public", dirs_exist_ok=True)
