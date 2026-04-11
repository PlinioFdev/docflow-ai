import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Django ASGI app must be initialised before any models or channels imports.
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter

from documents.consumers import JWTAuthMiddleware
from documents.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        ),
    }
)
