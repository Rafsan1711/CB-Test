import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings

# Initialize Firebase app
if not firebase_admin._apps:
    cred_dict = settings.firebase_credentials_dict
    if cred_dict:
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)

security = HTTPBearer()

async def verify_firebase_token(token: str) -> dict:
    if not firebase_admin._apps:
        # For local dev without firebase, you might want to mock this or raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase not initialized"
        )
    try:
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    user_data = await verify_firebase_token(token)
    return user_data
