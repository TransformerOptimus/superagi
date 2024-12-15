from fastapi import Depends, HTTPException, Header, Security, status
from fastapi.security import APIKeyHeader
from fastapi_jwt_auth import AuthJWT
from fastapi_sqlalchemy import db
from fastapi.security.api_key import APIKeyHeader
from superagi.config.config import get_config
from superagi.models.organisation import Organisation
from superagi.models.user import User
from superagi.models.api_key import ApiKey
from typing import Optional
from sqlalchemy import or_


def check_auth(Authorize: AuthJWT = Depends()):
    """
    Function to check if the user is authenticated or not based on the environment.

    Args:
        Authorize (AuthJWT, optional): Instance of AuthJWT class to authorize the user. Defaults to Depends().

    Returns:
        AuthJWT: Instance of AuthJWT class if the user is authenticated.
    """
    env = get_config("ENV", "DEV")
    if env == "PROD":
        Authorize.jwt_required()
    return Authorize


def get_user_organisation(Authorize: AuthJWT = Depends(check_auth)):
    """
    Function to get the organisation of the authenticated user based on the environment.

    Args:
        Authorize (AuthJWT, optional): Instance of AuthJWT class to authorize the user. Defaults to Depends on check_auth().

    Returns:
        Organisation: Instance of Organisation class to which the authenticated user belongs.
    """
    user = get_current_user(Authorize)
    if user is None:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    organisation = db.session.query(Organisation).filter(Organisation.id == user.organisation_id).first()
    return organisation


def get_current_user(Authorize: AuthJWT = Depends(check_auth), request = Depends()):
    env = get_config("ENV", "DEV")

    if env == "DEV":
        email = "super6@agi.com"
    else:
        # Check for HTTP basic auth headers
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Basic '):
            import base64
            auth_decoded = base64.b64decode(auth_header.split(' ')[1]).decode('utf-8')
            username, password = auth_decoded.split(':')
            # Assuming username is the email
            email = username
        else:
            # Retrieve the email of the logged-in user from the JWT token payload
            email = Authorize.get_jwt_subject()

    # Query the User table to find the user by their email
    user = db.session.query(User).filter(User.email == email).first()
    return user

api_key_header = APIKeyHeader(name="X-API-Key")


def validate_api_key(api_key: str = Security(api_key_header)) -> str:
    query_result = db.session.query(ApiKey).filter(ApiKey.key == api_key,
                                                   or_(ApiKey.is_expired == False, ApiKey.is_expired == None)).first()
    if query_result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )

    return query_result.key


def get_organisation_from_api_key(api_key: str = Security(api_key_header)) -> Organisation:
    query_result = db.session.query(ApiKey).filter(ApiKey.key == api_key,
                                                   or_(ApiKey.is_expired == False, ApiKey.is_expired == None)).first()
    if query_result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )

    organisation = db.session.query(Organisation).filter(Organisation.id == query_result.org_id).first()
    return  organisation
