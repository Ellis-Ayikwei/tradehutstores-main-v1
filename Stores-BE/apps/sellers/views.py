import uuid

from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.store.flags import feature_enabled

from . import services, storage
from .models import SellerDocument, SellerProfile
from .permissions import IsSeller, IsStaff
from .serializers import (
    AdminDocumentUpdateSerializer,
    AdminSellerDetailSerializer,
    AdminSellerListSerializer,
    AdminSellerUpdateSerializer,
    SellerDocumentSerializer,
    SellerDocumentUploadSerializer,
    SellerMeSerializer,
    SellerMeUpdateSerializer,
    SellerOnboardingSerializer,
    SellerPublicSerializer,
)


class SellersPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _with_documents(qs):
    return qs.prefetch_related("documents", "selling_categories")


def _public_sellers():
    return SellerProfile.objects.filter(verification_status="verified", is_active=True)


# ------------------------------------------------------------------ seller (self)

class SellerOnboardingView(APIView):
    """SE1 - apply to become a seller. Authenticated user, one profile each."""

    permission_classes = [IsAuthenticated, feature_enabled("sellers")]

    def post(self, request):
        serializer = SellerOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = services.create_seller_application(
            request.user, serializer.validated_profile_data()
        )
        profile = _with_documents(SellerProfile.objects.filter(pk=profile.pk)).get()
        return Response(
            SellerMeSerializer(profile, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class _MyProfileMixin:
    permission_classes = [IsAuthenticated, feature_enabled("sellers"), IsSeller]

    def check_permissions(self, request):
        # The platform owner (superuser) always has a store: create it before IsSeller runs.
        user = request.user
        if user and user.is_authenticated and user.is_superuser:
            services.ensure_owner_profile(user)
        super().check_permissions(request)

    def get_profile(self):
        return _with_documents(
            SellerProfile.objects.select_related("user").filter(user=self.request.user)
        ).get()


class SellerMeView(_MyProfileMixin, APIView):
    """SE2 - own profile (read / update)."""

    def get(self, request):
        return Response(SellerMeSerializer(self.get_profile(), context={"request": request}).data)

    def patch(self, request):
        profile = self.get_profile()
        serializer = SellerMeUpdateSerializer(
            profile, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(SellerMeSerializer(self.get_profile(), context={"request": request}).data)


class SellerResubmitView(_MyProfileMixin, APIView):
    """SE2 - rejected seller sends the application back to review."""

    def post(self, request):
        services.resubmit_application(self.get_profile())
        return Response(SellerMeSerializer(self.get_profile(), context={"request": request}).data)


class SellerMyDocumentsView(_MyProfileMixin, APIView):
    """SE3 - list / upload own KYC documents (multipart)."""

    def get(self, request):
        profile = self.get_profile()
        return Response(
            SellerDocumentSerializer(
                profile.documents.exclude(status="superseded"), many=True, context={"request": request}
            ).data
        )

    def post(self, request):
        profile = self.get_profile()
        serializer = SellerDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = services.add_document(
            profile, serializer.validated_data["kind"], serializer.validated_data["file"]
        )
        return Response(
            SellerDocumentSerializer(document, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# ----------------------------------------------------------------------- public

class PublicSellerListView(generics.ListAPIView):
    """SE5 - verified, active sellers only."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = SellerPublicSerializer
    pagination_class = SellersPagination

    def get_queryset(self):
        qs = _public_sellers().prefetch_related("selling_categories").order_by("business_name", "id")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(business_name__icontains=q)
        return qs


class PublicSellerDetailView(APIView):
    """SE6 - public store profile by slug or UUID. Unverified -> 404."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug_or_uuid):
        qs = _public_sellers().prefetch_related("selling_categories")
        try:
            seller = qs.filter(pk=uuid.UUID(str(slug_or_uuid))).first()
        except ValueError:
            seller = qs.filter(store_slug=slug_or_uuid).first()
        if seller is None:
            raise Http404
        return Response(SellerPublicSerializer(seller, context={"request": request}).data)


# ------------------------------------------------------------------------ staff

class AdminSellerListView(generics.ListAPIView):
    """SE7 - application queue / all sellers."""

    permission_classes = [IsAuthenticated, IsStaff]
    serializer_class = AdminSellerListSerializer
    pagination_class = SellersPagination

    def get_queryset(self):
        qs = _with_documents(SellerProfile.objects.select_related("user"))
        params = self.request.query_params
        status_filter = params.get("status") or params.get("verification_status")
        if status_filter:
            qs = qs.filter(verification_status=status_filter)
        is_active = params.get("is_active")
        if is_active in ("true", "false"):
            qs = qs.filter(is_active=(is_active == "true"))
        q = params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(business_name__icontains=q)
                | Q(business_email__icontains=q)
                | Q(user__email__icontains=q)
            )
        return qs.order_by("-updated_at", "id")


class AdminSellerDetailView(APIView):
    """SE7 - review / update / soft-delete one seller."""

    permission_classes = [IsAuthenticated, IsStaff]

    def get_seller(self, pk):
        try:
            return _with_documents(SellerProfile.objects.select_related("user")).get(pk=pk)
        except SellerProfile.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        return Response(
            AdminSellerDetailSerializer(self.get_seller(pk), context={"request": request}).data
        )

    @transaction.atomic
    def patch(self, request, pk):
        seller = self.get_seller(pk)
        serializer = AdminSellerUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "verification_status" in data:
            services.set_verification_status(
                seller,
                data["verification_status"],
                notes=data.get("verification_notes"),
                actor=request.user,
            )
        elif "verification_notes" in data:
            SellerProfile.objects.filter(pk=seller.pk).update(
                verification_notes=data["verification_notes"]
            )

        plain = {k: data[k] for k in ("is_active", "is_accepting_orders", "commission_rate") if k in data}
        if plain:
            SellerProfile.objects.filter(pk=seller.pk).update(**plain)
            if "is_active" in plain and plain["is_active"] != seller.is_active:
                services.refresh_seller_visibility(seller.pk)

        return Response(
            AdminSellerDetailSerializer(self.get_seller(pk), context={"request": request}).data
        )

    @transaction.atomic
    def delete(self, request, pk):
        seller = self.get_seller(pk)
        SellerProfile.objects.filter(pk=seller.pk).update(is_active=False)
        services.refresh_seller_visibility(seller.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminSellerDocumentsView(APIView):
    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request, pk):
        if not SellerProfile.objects.filter(pk=pk).exists():
            raise Http404
        docs = SellerDocument.objects.filter(seller_id=pk).order_by("-created_on")
        return Response(SellerDocumentSerializer(docs, many=True, context={"request": request}).data)


class AdminDocumentUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsStaff]

    def patch(self, request, doc_id):
        try:
            document = SellerDocument.objects.get(pk=doc_id)
        except SellerDocument.DoesNotExist:
            raise Http404
        serializer = AdminDocumentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = services.review_document(
            document, serializer.validated_data["status"], serializer.validated_data.get("note", "")
        )
        return Response(SellerDocumentSerializer(document, context={"request": request}).data)


_DOCUMENT_CONTENT_TYPES = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
}


class SellerDocumentFileView(APIView):
    """Serve a document for a short-lived signed token (local private storage).

    Tokens are only issued by the owner/staff document endpoints; this view
    holds no other credential, so it never lists or guesses documents.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token):
        doc_id = storage.document_id_from_token(token)
        document = SellerDocument.objects.filter(pk=doc_id).first() if doc_id else None
        if document is None or not document.file:
            raise Http404
        try:
            handle = document.file.open("rb")
        except (FileNotFoundError, OSError):
            raise Http404
        ext = document.file.name.rsplit(".", 1)[-1].lower()
        response = FileResponse(
            handle, content_type=_DOCUMENT_CONTENT_TYPES.get(ext, "application/octet-stream")
        )
        response["Content-Disposition"] = f'inline; filename="{document.kind}.{ext}"'
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Security-Policy"] = "sandbox"
        return response
