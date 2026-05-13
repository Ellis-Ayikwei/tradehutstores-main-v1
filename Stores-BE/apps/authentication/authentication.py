from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from .jwt_denylist import backend_enabled as denylist_backend_enabled
from .jwt_denylist import is_jti_blocked


class DenylistJWTAuthentication(JWTAuthentication):
    """
    Same as SimpleJWT's JWTAuthentication but rejects access tokens whose ``jti``
    was placed in the Redis denylist (logout / revocation).
    """

    def authenticate(self, request):
        out = super().authenticate(request)
        if out is None:
            return out
        if not denylist_backend_enabled():
            return out
        _, validated_token = out
        jti = validated_token.get("jti")
        if jti and is_jti_blocked(jti):
            raise InvalidToken({"detail": "Token has been invalidated.", "code": "token_denied"})
        return out
