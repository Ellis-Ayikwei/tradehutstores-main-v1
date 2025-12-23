from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
import uuid

from apps.core.models import BaseModel


class CustomUserManager(BaseUserManager):
    def create_user(self, email, username=None, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        # Auto-generate username from email if not provided
        if not username:
            username = email.split("@")[0]
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = CustomUserManager()  # Use our custom manager
    USERNAME_FIELD = "email"  # Use email for authentication (e-commerce standard)
    REQUIRED_FIELDS = ["username"]  # Username still required but not for login

    # Override email field to make it unique (required when using as USERNAME_FIELD)
    email = models.EmailField(unique=True, blank=False, null=False)

    # Two-Factor Authentication fields
    is_2fa_enabled = models.BooleanField(default=False)
    phone_number_2fa = models.CharField(max_length=20, blank=True, null=True)

    objects = CustomUserManager()

    class Meta:
        managed = True
        db_table = "users"

    def __str__(self):
        return self.email or self.username or str(self.id)


class Profile(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to="profile_pics/", blank=True, null=True
    )
    bio = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = "user_profiles"


class Address(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    address = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)

    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )

    class Meta:
        managed = True
        db_table = "addresses"

    def __str__(self):
        return self.address


class UserSearchHistory(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="search_histories"
    )
    query = models.CharField(max_length=255)
    category = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.user} searched for '{self.query}'" if self.user else self.query

    class Meta:
        managed = True
        db_table = "user_search_histories"
