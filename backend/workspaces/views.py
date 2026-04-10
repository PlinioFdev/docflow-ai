from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response

from .models import Workspace, WorkspaceMember
from .serializers import RegisterSerializer, WorkspaceMemberSerializer, WorkspaceSerializer
from .token_serializer import CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(generics.GenericAPIView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user)


class WorkspaceMemberViewSet(viewsets.ModelViewSet):
    queryset = WorkspaceMember.objects.all()
    serializer_class = WorkspaceMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
