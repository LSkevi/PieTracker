"""Shared pytest configuration for the backend test suite.

Ensures the backend/ directory (parent of tests/) is importable so that
`import security` / `import parsing` resolve to the same top-level modules that
main.py imports, regardless of the directory pytest is invoked from.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
