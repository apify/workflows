from __future__ import annotations

from argparse import ArgumentParser, BooleanOptionalAction
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


def load_pr_issues(owner: str, repo: str) -> dict[int, list[int]]:
    output = subprocess.check_output(
        [
            str(Path(__file__).parent / "fetch_pr_issues.sh"),
            owner,
            repo,
        ]
    )

    try:
        pr_issues = json.loads(output)
    except ValueError:
        print(f"fetch_pr_issues.sh output: {output}")
        raise

    if pr_issues is None:
        return {}

    return {int(key): value for key, value in pr_issues.items()}


def enhance_release(
    release: dict[str, Any], is_release_notes: bool, unreleased_version: str | None
) -> None:
    release["extra"] = release["extra"] or {}
    release["extra"]["is_release_notes"] = is_release_notes

    if release["version"]:
        release["extra"]["release_link"] = (
            f"{repo_url}/releases/tag/{release['version']}"
        )
    elif unreleased_version:
        release["extra"]["unreleased_version"] = unreleased_version


def enhance_commit(commit: dict[str, Any], pr_issues: dict[int, list[int]]) -> None:
    commit_remote = commit.get("remote", {})

    pr_number = commit_remote.get("pr_number")
    username = commit_remote.get("username")

    commit["extra"] = commit["extra"] or {}
    commit["extra"]["commit_link"] = f"{repo_url}/commit/{commit['id']}"

    if username:
        commit["extra"]["username"] = username

    if pr_number:
        commit["extra"]["closed_issues"] = pr_issues.get(pr_number, [])

        pr_link = f"{repo_url}/pull/{pr_number}"
        commit["extra"]["pr_link"] = f"([#{pr_number}]({pr_link}))"
        commit["extra"]["raw_pr_link"] = f"(#{pr_number})"

        commit["extra"]["closed_issue_links"] = [
            f"[#{issue}]({repo_url}/issues/{issue})"
            for issue in commit["extra"]["closed_issues"]
        ]


parser = ArgumentParser()
parser.add_argument("--repo", type=str, required=True)
parser.add_argument("--unreleased-version", nargs="?", default=None, type=str)
parser.add_argument("--release-notes", action=BooleanOptionalAction)
parser.add_argument("--no-github", default=False, action="store_true")


if __name__ == "__main__":
    args = parser.parse_args()
    repo_url = f"https://github.com/{args.repo}"
    owner, repo = args.repo.split("/")

    pr_issues = load_pr_issues(owner, repo)
    context = json.load(sys.stdin)

    if not args.no_github:    
        for release in context:
            enhance_release(release, args.release_notes, args.unreleased_version)

            for commit in release["commits"]:
                enhance_commit(commit, pr_issues)

    json.dump(context, sys.stdout)
