import uuid

from django.conf import settings
from django.db import models


class Workspace(models.Model):
    class PlanChoices(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    plan = models.CharField(max_length=20, choices=PlanChoices.choices, default=PlanChoices.FREE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    class RoleChoices(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workspace_memberships")
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("workspace", "user")

    def __str__(self):
        return f"{self.user} in {self.workspace} ({self.role})"
