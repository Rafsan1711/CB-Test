import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.supabase_service import db

async def main():
    repos = await db.get_user_repos("f2b81faf-1d53-4dcc-9e23-558aff7c2f18")
    for r in repos:
        print(f"Repo: {r['github_full_name']}, Webhook ID: {r.get('webhook_hook_id')}")

asyncio.run(main())
