import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.supabase_service import db

async def main():
    prs = await db.get_prs_by_repo("f8bfd9fd-4649-4812-bfcb-5a4a5d9b38dd")
    for pr in prs:
        print(f"PR: {pr['github_pr_number']}, Status: {pr['status']}")

asyncio.run(main())
