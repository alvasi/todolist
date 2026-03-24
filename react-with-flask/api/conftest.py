"""Pytest configuration to ensure the project root is on sys.path during tests.

This helps tests import the local `app` package (the `app/` directory) when pytest
is invoked from environments where the current working directory isn't automatically
added to sys.path.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    # Insert at position 0 to prefer local package imports over installed ones
    sys.path.insert(0, str(ROOT))
