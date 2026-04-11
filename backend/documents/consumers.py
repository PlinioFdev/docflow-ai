import json
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class DocumentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.workspace_id = self.scope["url_route"]["kwargs"]["workspace_id"]
        self.group_name = f"workspace_{self.workspace_id}"

        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return

        is_member = await self._is_workspace_member(user, self.workspace_id)
        if not is_member:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get("type") == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def job_update(self, event):
        """Handler called by channel layer group_send with type 'job_update'."""
        await self.send(text_data=json.dumps({"type": "job_update", "data": event["data"]}))

    @classmethod
    async def send_job_update(cls, workspace_id: str, job_data: dict):
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"workspace_{workspace_id}",
            {"type": "job_update", "data": job_data},
        )

    @database_sync_to_async
    def _is_workspace_member(self, user, workspace_id: str) -> bool:
        from workspaces.models import WorkspaceMember

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user=user
        ).exists()


class JWTAuthMiddleware:
    """WebSocket middleware that authenticates via a JWT token in the query string."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        qs = parse_qs(scope.get("query_string", b"").decode())
        token_key = qs.get("token", [None])[0]
        scope["user"] = await _resolve_user(token_key)
        return await self.inner(scope, receive, send)


@database_sync_to_async
def _resolve_user(token_key):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import AnonymousUser
    from rest_framework_simplejwt.exceptions import TokenError
    from rest_framework_simplejwt.tokens import AccessToken

    if not token_key:
        return AnonymousUser()

    User = get_user_model()
    try:
        token = AccessToken(token_key)
        return User.objects.get(id=token["user_id"])
    except (TokenError, User.DoesNotExist, Exception):
        return AnonymousUser()
