"""
promos/serializers.py
"""
from rest_framework import serializers
from .models import PromoCode


class PromoValidationRequestSerializer(serializers.Serializer):
    code         = serializers.CharField(max_length=50)
    # Cart snapshot — frontend sends these for server-side validation
    subtotal     = serializers.DecimalField(max_digits=12, decimal_places=2)
    item_count   = serializers.IntegerField(min_value=0)
    item_ids     = serializers.ListField(child=serializers.IntegerField(), default=list)
    category_ids = serializers.ListField(child=serializers.IntegerField(), default=list)
    session_key  = serializers.CharField(max_length=64, default="", allow_blank=True)


class PromoValidationResponseSerializer(serializers.Serializer):
    valid             = serializers.BooleanField()
    code              = serializers.CharField()
    discount_type     = serializers.CharField(allow_blank=True)
    discount_amount   = serializers.DecimalField(max_digits=10, decimal_places=2)
    free_shipping     = serializers.BooleanField()
    description       = serializers.CharField(allow_blank=True)
    error_code        = serializers.CharField(allow_blank=True)
    error_message     = serializers.CharField(allow_blank=True)
