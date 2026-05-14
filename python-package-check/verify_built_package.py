#!/usr/bin/env python

"""Verify that built artifacts (sdist + wheel) in `dist/` install and import correctly.

Designed to run against any Python package built via `uv build` / hatch / similar.
Used both locally and in CI by the `apify/workflows/python-package-check` composite action.

Checks performed:

* `dist/` contains exactly one `.whl` and one `.tar.gz`.
* Sdist includes all expected source/data/metadata files and excludes `tests/`, `docs/`, `website/`, `examples/`,
  `.github/`, and `uv.lock`.
* Wheel includes all expected source/data files and a `*.dist-info/METADATA` entry.
* Wheel installs into a fresh venv and the package imports.
* Sdist installs into a fresh venv (forces pip to rebuild the wheel from sdist contents) and the package imports.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path
from typing import Literal

REQUIRED_METADATA_FILES = (
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'pyproject.toml',
)

FORBIDDEN_SDIST_TOPLEVEL_DIRS = (
    'tests',
    'docs',
    'website',
    'examples',
    '.github',
)

FORBIDDEN_SDIST_FILES = ('uv.lock',)


def passed(msg: str) -> None:
    print(f'PASS  {msg}', flush=True)


def failed(msg: str) -> None:
    print(f'FAIL  {msg}', flush=True)


def info(msg: str) -> None:
    print(f'      {msg}', flush=True)


def section(title: str) -> None:
    print(f'\n=== {title} ===')


def find_artifacts(dist_dir: Path) -> tuple[Path, Path]:
    if not dist_dir.is_dir():
        raise SystemExit(f'dist directory not found: {dist_dir}')
    wheels = sorted(dist_dir.glob('*.whl'))
    sdists = sorted(dist_dir.glob('*.tar.gz'))
    if len(wheels) != 1:
        raise SystemExit(f'Expected exactly one .whl in {dist_dir}, found {len(wheels)}: {wheels}')
    if len(sdists) != 1:
        raise SystemExit(f'Expected exactly one .tar.gz in {dist_dir}, found {len(sdists)}: {sdists}')
    return wheels[0], sdists[0]


def list_sdist_members(sdist: Path) -> list[str]:
    prefix = sdist.name.removesuffix('.tar.gz') + '/'
    with tarfile.open(sdist, 'r:gz') as tar:
        return [m.name.removeprefix(prefix) for m in tar.getmembers() if m.isfile() and m.name.startswith(prefix)]


def list_wheel_members(wheel: Path) -> list[str]:
    with zipfile.ZipFile(wheel) as zf:
        return [n for n in zf.namelist() if not n.endswith('/')]


def collect_repo_files(src_package_dir: Path) -> tuple[list[str], list[str]]:
    """Return (source_files, data_files) relative to the parent of `src_package_dir`.

    The relative-to-parent layout matches both sdist (`src/<pkg>/...`) and wheel (`<pkg>/...`).
    Data files are any non-`.py` file that isn't a compiled artifact or cache.
    """
    if not src_package_dir.is_dir():
        raise SystemExit(f'Source package directory not found: {src_package_dir}')
    src_root = src_package_dir.parent
    source: list[str] = []
    data: list[str] = []
    for path in src_package_dir.rglob('*'):
        if not path.is_file():
            continue
        if '__pycache__' in path.parts or path.suffix in ('.pyc', '.pyo'):
            continue
        rel = path.relative_to(src_root).as_posix()
        if path.suffix == '.py':
            source.append(rel)
        else:
            data.append(rel)
    return sorted(source), sorted(data)


def _preview(items: list[str], limit: int = 5) -> str:
    return ', '.join(items[:limit]) + ('...' if len(items) > limit else '')


def _check_files_present(
    member_set: set[str],
    required: list[str],
    prefix: str,
    label: str,
    category: str,
) -> bool:
    missing = [r for r in required if f'{prefix}{r}' not in member_set]
    if missing:
        failed(f'{label} missing {len(missing)} {category} file(s): {_preview(missing)}')
        return False
    passed(f'{label} has all {len(required)} {category} files')
    return True


def check_sdist_contents(members: list[str], source_files: list[str], data_files: list[str]) -> bool:
    section('Checking sdist contents')
    member_set = set(members)
    results: list[bool] = []

    for meta in REQUIRED_METADATA_FILES:
        if meta in member_set:
            passed(f'sdist has {meta}')
            results.append(True)
        else:
            failed(f'sdist missing {meta}')
            results.append(False)

    for forbidden in FORBIDDEN_SDIST_TOPLEVEL_DIRS:
        leaked = [m for m in members if m.startswith(f'{forbidden}/')]
        if leaked:
            failed(f'sdist leaked {forbidden}/ files: {_preview(leaked, limit=3)}')
            results.append(False)
        else:
            passed(f'sdist has no {forbidden}/ leak')
            results.append(True)

    for forbidden in FORBIDDEN_SDIST_FILES:
        if forbidden in member_set:
            failed(f'sdist contains forbidden file {forbidden}')
            results.append(False)
        else:
            passed(f'sdist has no {forbidden}')
            results.append(True)

    results.append(_check_files_present(member_set, source_files, 'src/', 'sdist', '.py source'))
    if data_files:
        results.append(_check_files_present(member_set, data_files, 'src/', 'sdist', 'data'))
    return all(results)


def check_wheel_contents(members: list[str], source_files: list[str], data_files: list[str]) -> bool:
    section('Checking wheel contents')
    member_set = set(members)
    results: list[bool] = []

    has_metadata = any(m.endswith('/METADATA') and '.dist-info/' in m for m in members)
    if has_metadata:
        passed('wheel has .dist-info/METADATA')
        results.append(True)
    else:
        failed('wheel missing .dist-info/METADATA')
        results.append(False)

    results.append(_check_files_present(member_set, source_files, '', 'wheel', '.py source'))
    if data_files:
        results.append(_check_files_present(member_set, data_files, '', 'wheel', 'data'))
    return all(results)


def install_and_smoke_test(
    artifact: Path,
    kind: Literal['wheel', 'sdist'],
    venv_dir: Path,
    package_name: str,
    python_version: str,
    extras: str,
    smoke_code: str,
) -> bool:
    section(f'Installing {kind} into fresh venv')
    subprocess.run(['uv', 'venv', '--quiet', '--python', python_version, str(venv_dir)], check=True)
    python = venv_dir / 'bin' / 'python'
    spec = f'{artifact}[{extras}]' if extras else str(artifact)
    res = subprocess.run(
        ['uv', 'pip', 'install', '--quiet', '--python', str(python), spec],
        capture_output=True,
        text=True,
        check=False,
    )
    if res.returncode != 0:
        failed(f'{kind} install failed')
        info(res.stderr.strip() or res.stdout.strip())
        return False
    passed(f'{kind} installed into {venv_dir}')

    base_smoke = f'import {package_name}\nprint(getattr({package_name}, "__version__", "<no __version__>"))\n'
    code = base_smoke + (smoke_code or '')
    res = subprocess.run([str(python), '-c', code], capture_output=True, text=True, check=False)
    if res.returncode != 0:
        failed(f'{kind} import smoke test failed')
        info(res.stderr.strip())
        return False
    version = next(iter(res.stdout.strip().splitlines()), '<unknown>')
    passed(f'{kind} imports OK ({package_name}=={version})')
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--package', required=True, help='Importable Python package name (e.g. crawlee).')
    parser.add_argument('--dist-dir', type=Path, default=Path('dist'), help='Directory containing built artifacts.')
    parser.add_argument(
        '--src-package-dir',
        default='',
        help='Path to the package source directory. Default: src/<package>.',
    )
    parser.add_argument('--extras', default='', help='Optional install extras (e.g. all).')
    parser.add_argument('--python-version', default='3.14', help='Python version for verification venvs.')
    parser.add_argument(
        '--smoke-code',
        default='',
        help='Optional extra Python code to run after `import <package>` in the smoke test.',
    )
    args = parser.parse_args(argv)

    src_package_dir = (Path(args.src_package_dir) if args.src_package_dir else Path('src') / args.package).resolve()

    wheel, sdist = find_artifacts(args.dist_dir.resolve())
    info(f'package:  {args.package}')
    info(f'src dir:  {src_package_dir}')
    info(f'wheel:    {wheel.name}')
    info(f'sdist:    {sdist.name}')

    sdist_members = list_sdist_members(sdist)
    wheel_members = list_wheel_members(wheel)
    source_files, data_files = collect_repo_files(src_package_dir)
    info(f'sources:  {len(source_files)}')
    info(f'data:     {len(data_files)}')

    results: list[bool] = []
    results.append(check_sdist_contents(sdist_members, source_files, data_files))
    results.append(check_wheel_contents(wheel_members, source_files, data_files))

    with tempfile.TemporaryDirectory(prefix='verify-built-package-') as tmp:
        tmp_path = Path(tmp)
        results.append(
            install_and_smoke_test(
                wheel,
                'wheel',
                tmp_path / 'venv-wheel',
                args.package,
                args.python_version,
                args.extras,
                args.smoke_code,
            )
        )
        results.append(
            install_and_smoke_test(
                sdist,
                'sdist',
                tmp_path / 'venv-sdist',
                args.package,
                args.python_version,
                args.extras,
                args.smoke_code,
            )
        )

    section('Summary')
    if all(results):
        passed('all checks passed')
        return 0
    failed(f'{sum(1 for r in results if not r)} of {len(results)} check group(s) failed')
    return 1


if __name__ == '__main__':
    sys.exit(main())
