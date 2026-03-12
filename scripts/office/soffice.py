"""LibreOffice process manager with sandbox-safe socket handling."""

import os
import subprocess
import sys
import tempfile


def find_soffice() -> str:
    """Find the LibreOffice soffice binary."""
    candidates = [
        "/usr/bin/soffice",
        "/usr/lib/libreoffice/program/soffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path

    # Fall back to PATH lookup
    try:
        result = subprocess.run(
            ["which", "soffice"], capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        pass

    print("Error: LibreOffice not found. Install it first.", file=sys.stderr)
    sys.exit(1)


def get_user_profile_dir() -> str:
    """Get a writable LibreOffice user profile directory."""
    profile = os.path.join(tempfile.gettempdir(), "libreoffice_profile")
    os.makedirs(profile, exist_ok=True)
    return profile


def run_macro(file_path: str, macro: str, timeout: int = 60) -> subprocess.CompletedProcess:
    """Run a LibreOffice macro on a file with sandbox-safe settings."""
    soffice = find_soffice()
    profile = get_user_profile_dir()

    env = os.environ.copy()
    env["SAL_USE_VCLPLUGIN"] = "gen"  # headless-friendly

    cmd = [
        soffice,
        "--headless",
        "--norestore",
        "--nolockcheck",
        f"-env:UserInstallation=file://{profile}",
        f"macro:///{macro}",
        file_path,
    ]

    return subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout, env=env
    )
