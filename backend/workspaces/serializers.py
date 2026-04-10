from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from .models import Workspace, WorkspaceMember

User = get_user_model()


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = "__all__"


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceMember
        fields = "__all__"


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        email = validated_data["email"]
        first_name = validated_data["first_name"]
        last_name = validated_data["last_name"]

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        workspace_name = f"{first_name}'s Workspace"
        base_slug = slugify(workspace_name)
        slug = base_slug
        counter = 1
        while Workspace.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        workspace = Workspace.objects.create(
            name=workspace_name,
            slug=slug,
            owner=user,
        )

        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role=WorkspaceMember.RoleChoices.OWNER,
        )

        return user
