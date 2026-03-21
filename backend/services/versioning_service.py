import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class VersioningService:
    def parse_version(self, version_str: str) -> tuple[int, int, int]:
        """Parse 'v1.2.3' -> (1, 2, 3). Handles edge cases."""
        logger.debug(f"[VERSION] Parsing version string: {version_str}")
        if not version_str:
            return (0, 0, 0)
        
        # Remove 'v' or 'V' prefix
        clean_v = version_str.lstrip('vV')
        parts = clean_v.split('.')
        
        try:
            major = int(parts[0]) if len(parts) > 0 else 0
            minor = int(parts[1]) if len(parts) > 1 else 0
            patch = int(parts[2]) if len(parts) > 2 else 0
            return (major, minor, patch)
        except ValueError:
            return (0, 0, 0)

    def bump_version(self, current: str, bump_type: str) -> str:
        """
        bump_type "major": v1.2.3 -> v2.0.0
        bump_type "minor": v1.2.3 -> v1.3.0  
        bump_type "patch": v1.2.3 -> v1.2.4
        Always returns string with "v" prefix.
        """
        logger.info(f"[VERSION] Bumping version {current} with type: {bump_type}")
        major, minor, patch = self.parse_version(current)
        bump_type = bump_type.lower()
        
        if bump_type == "major":
            major += 1
            minor = 0
            patch = 0
        elif bump_type == "minor":
            minor += 1
            patch = 0
        else:
            # Default to patch
            patch += 1
            
        return f"v{major}.{minor}.{patch}"

    def generate_tag_name(self, version: str) -> str:
        """Returns version string (it IS the tag name): 'v1.2.4'"""
        return version if version.startswith('v') else f"v{version}"

    def determine_bump_type_from_commits(self, commit_messages: list[str]) -> str:
        """
        Heuristic rules:
        - Any commit with "BREAKING CHANGE" or "!:" -> "major"
        - Any commit with "feat:" or "feature:" -> "minor"
        - Everything else -> "patch"
        """
        logger.debug(f"[VERSION] Determining bump type from {len(commit_messages)} commits")
        bump_type = "patch"
        
        for msg in commit_messages:
            msg_lower = msg.lower()
            if "breaking change" in msg_lower or "!:" in msg_lower:
                return "major"
            if "feat:" in msg_lower or "feature:" in msg_lower:
                bump_type = "minor"
                
        return bump_type

    def format_changelog_entry(self, version: str, changes: list[dict]) -> str:
        """
        Format a CHANGELOG.md entry in Keep a Changelog format.
        changes: [{type, title, pr_number}]
        """
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        entry = f"## [{version}] - {date_str}\n\n"
        
        features = []
        fixes = []
        others = []
        
        for change in changes:
            title = change.get("title", "Update")
            pr = change.get("pr_number")
            pr_ref = f" (#{pr})" if pr else ""
            item = f"- {title}{pr_ref}"
            
            c_type = change.get("type", "").lower()
            title_lower = title.lower()
            
            if c_type == "feature" or "feat:" in title_lower:
                features.append(item)
            elif c_type == "bug" or "fix:" in title_lower:
                fixes.append(item)
            else:
                others.append(item)
                
        if features:
            entry += "### Added\n" + "\n".join(features) + "\n\n"
        if fixes:
            entry += "### Fixed\n" + "\n".join(fixes) + "\n\n"
        if others:
            entry += "### Changed\n" + "\n".join(others) + "\n\n"
            
        if not features and not fixes and not others:
            entry += "- Miscellaneous updates and improvements.\n\n"
            
        return entry.strip() + "\n"

versioning_svc = VersioningService()
