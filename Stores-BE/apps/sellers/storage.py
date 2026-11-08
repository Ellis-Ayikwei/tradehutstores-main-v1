"""Private storage for seller KYC documents.

* R2 enabled: the private bucket (``R2_KYC_BUCKET_NAME``, no public domain), under
  the ``kyc`` folder, with signed, short-lived URLs.
  Without the bucket variable any use of the storage
  raises ``ImproperlyConfigured`` (never silently the main media bucket).
* Otherwise: a directory outside ``MEDIA_ROOT`` (``PRIVATE_MEDIA_ROOT`` or
  ``<BASE_DIR>/private_media``) which ``/media/`` never serves. Local access is
  through short-lived signed tokens handled by ``SellerDocumentFileView``.
"""

from pathlib import Path

from decouple import config
from django.conf import settings
from django.core import signing
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import FileSystemStorage, Storage
from django.urls import reverse

SIGNED_URL_TTL_SECONDS = 600
# Folder for KYC files inside the shared private bucket.
KYC_FOLDER = "kyc"
_TOKEN_SALT = "sellers.document.file"


class KycStorageNotConfigured(Storage):
    """Stand-in used when R2 is on but no private KYC bucket is configured.

    Creating it must not break startup or ``manage.py check``; any real use
    (saving, reading, listing, URLs) raises ``ImproperlyConfigured`` so private
    documents never land in the public media bucket.
    """

    MESSAGE = (
        "R2_KYC_BUCKET_NAME is not set. KYC documents need a dedicated R2 bucket "
        "with public access disabled; they are never stored in the main media bucket."
    )

    def _fail(self, *args, **kwargs):
        raise ImproperlyConfigured(self.MESSAGE)

    _save = _open = exists = delete = url = size = listdir = get_available_name = _fail


def private_document_storage():
    if getattr(settings, "USE_R2", False):
        from storages.backends.s3 import S3Storage

        # The private bucket is shared by every private asset; KYC lives in its own folder
        # (``<R2_KYC_PREFIX>/seller_documents/<seller_id>/<uuid>.<ext>``).
        bucket = config("R2_KYC_BUCKET_NAME", default="").strip()
        if not bucket:
            return KycStorageNotConfigured()
        # Optional: a separate R2 API token scoped to the private bucket. Falls back to the
        # main R2 token, which must then also have access to this bucket.
        access_key = config("R2_PRIVATE_ACCESS_KEY_ID", default="").strip() or None
        secret_key = config("R2_PRIVATE_SECRET_ACCESS_KEY", default="").strip() or None
        return S3Storage(
            bucket_name=bucket,
            access_key=access_key,
            secret_key=secret_key,
            location=KYC_FOLDER,
            custom_domain=None,
            querystring_auth=True,
            querystring_expire=SIGNED_URL_TTL_SECONDS,
            file_overwrite=False,
            default_acl=None,
        )
    root = config("PRIVATE_MEDIA_ROOT", default="") or Path(settings.BASE_DIR) / "private_media"
    return FileSystemStorage(location=str(root), base_url=None)


def signed_file_url(document, request=None):
    """Short-lived URL for a document. Only call this from owner/staff endpoints."""
    if not document.file:
        return None
    storage = document.file.storage
    if isinstance(storage, KycStorageNotConfigured):
        return None
    if hasattr(storage, "bucket_name"):
        return storage.url(document.file.name, expire=SIGNED_URL_TTL_SECONDS)
    token = signing.TimestampSigner(salt=_TOKEN_SALT).sign_object({"doc": str(document.pk)})
    path = reverse("sellers:document_file", args=[token])
    return request.build_absolute_uri(path) if request else path


def document_id_from_token(token):
    """Return the document id for a valid, unexpired token, else ``None``."""
    try:
        data = signing.TimestampSigner(salt=_TOKEN_SALT).unsign_object(
            token, max_age=SIGNED_URL_TTL_SECONDS
        )
    except signing.BadSignature:
        return None
    return data.get("doc")
