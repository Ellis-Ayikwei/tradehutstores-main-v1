"""
Seller Profile Views
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q

from .models import SellerProfile, SellerDocument, User
from .serializers import (
    SellerProfileSerializer,
    SellerProfileCreateSerializer,
    SellerProfileUpdateSerializer,
    SellerProfilePublicSerializer,
    SellerDocumentSerializer,
    SellerStatsSerializer
)
from django.utils import timezone


class BecomeSellerView(APIView):
    """
    Convert user account to seller account.
    POST: Create seller profile for authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Check if user already has seller profile
        if hasattr(user, 'seller_profile'):
            return Response({
                'error': 'You already have a seller account',
                'seller_profile': SellerProfileSerializer(user.seller_profile).data
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create seller profile
        serializer = SellerProfileCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            seller_profile = serializer.save(user=user)
            
            return Response({
                'message': 'Seller profile created successfully',
                'seller_profile': SellerProfileSerializer(seller_profile).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SellerProfileView(APIView):
    """
    Manage seller profile.
    GET: Get current user's seller profile
    PUT/PATCH: Update seller profile
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            seller_profile = request.user.seller_profile
            serializer = SellerProfileSerializer(seller_profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'You do not have a seller account',
                'message': 'Create a seller account to access this feature'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request):
        return self._update(request, partial=False)
    
    def patch(self, request):
        return self._update(request, partial=True)
    
    def _update(self, request, partial=False):
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'You do not have a seller account'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = SellerProfileUpdateSerializer(
            seller_profile,
            data=request.data,
            partial=partial
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Seller profile updated successfully',
                'seller_profile': SellerProfileSerializer(seller_profile).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SellerPublicProfileView(APIView):
    """
    Get public seller profile by slug or ID.
    GET: Public view of seller profile
    """
    permission_classes = [AllowAny]
    
    def get(self, request, identifier):
        # Try to find by slug first, then by ID
        seller_profile = None
        
        try:
            seller_profile = SellerProfile.objects.get(store_slug=identifier)
        except SellerProfile.DoesNotExist:
            try:
                seller_profile = SellerProfile.objects.get(id=identifier)
            except SellerProfile.DoesNotExist:
                return Response({
                    'error': 'Seller not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = SellerProfilePublicSerializer(seller_profile)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SellerStatsView(APIView):
    """
    Get seller statistics and analytics.
    GET: Get seller dashboard stats
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'You do not have a seller account'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get order statistics
        from apps.orders.models import Order
        from apps.products.models import Product
        
        seller_orders = Order.objects.filter(
            items__product__seller_profile=seller_profile
        ).distinct()
        
        # Count products
        total_products = Product.objects.filter(seller_profile=seller_profile).count()
        
        # Count order statuses
        pending_orders = seller_orders.filter(status='pending').count()
        completed_orders = seller_orders.filter(status='completed').count()
        
        # Get recent orders
        recent_orders = seller_orders.order_by('-created_at')[:5].values(
            'id', 'total_amount', 'status', 'created_at'
        )
        
        stats = {
            'total_sales': seller_profile.total_sales,
            'total_orders': seller_profile.total_orders,
            'total_products': total_products,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'rating': seller_profile.rating,
            'total_reviews': seller_profile.total_reviews,
            'recent_orders': list(recent_orders)
        }
        
        serializer = SellerStatsSerializer(data=stats)
        serializer.is_valid()
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class SellerDocumentUploadView(APIView):
    """
    Upload verification documents.
    POST: Upload document
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'You do not have a seller account'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = SellerDocumentSerializer(data=request.data)
        
        if serializer.is_valid():
            document = serializer.save(seller=seller_profile)
            
            return Response({
                'message': 'Document uploaded successfully',
                'document': SellerDocumentSerializer(document).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SellerDocumentListView(APIView):
    """
    List seller documents.
    GET: List all documents for current seller
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'You do not have a seller account'
            }, status=status.HTTP_404_NOT_FOUND)
        
        documents = seller_profile.documents.all()
        serializer = SellerDocumentSerializer(documents, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class ToggleAcceptOrdersView(APIView):
    """
    Toggle seller's order acceptance status.
    POST: Enable/disable order acceptance
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'You do not have a seller account'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Toggle status
        seller_profile.is_accepting_orders = not seller_profile.is_accepting_orders
        seller_profile.save()
        
        return Response({
            'message': f'Order acceptance {"enabled" if seller_profile.is_accepting_orders else "disabled"}',
            'is_accepting_orders': seller_profile.is_accepting_orders
        }, status=status.HTTP_200_OK)


class UpdateSellerMetricsView(APIView):
    """
    Manually trigger metrics update.
    POST: Update seller metrics
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'You do not have a seller account'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update metrics
        seller_profile.update_metrics()
        
        return Response({
            'message': 'Metrics updated successfully',
            'seller_profile': SellerProfileSerializer(seller_profile).data
        }, status=status.HTTP_200_OK)


class ListSellersView(APIView):
    """
    List all verified sellers (public).
    GET: List verified sellers
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Get verified and active sellers only
        sellers = SellerProfile.objects.filter(
            is_verified=True,
            is_active=True
        ).order_by('-rating', '-total_sales')
        
        # Apply filters
        search = request.query_params.get('search', None)
        if search:
            sellers = sellers.filter(
                Q(business_name__icontains=search) |
                Q(business_description__icontains=search)
            )
        
        serializer = SellerProfilePublicSerializer(sellers, many=True)
        
        return Response({
            'count': sellers.count(),
            'sellers': serializer.data
        }, status=status.HTTP_200_OK)


class AdminListSellersView(APIView):
    """
    Admin endpoint to list all sellers (for management).
    GET: List all sellers regardless of verification status
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check if user is admin/staff
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'error': 'You do not have permission to access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get all sellers
        sellers = SellerProfile.objects.select_related('user').all().order_by('-created_at')
        
        # Apply filters
        search = request.query_params.get('search', None)
        if search:
            sellers = sellers.filter(
                Q(business_name__icontains=search) |
                Q(business_description__icontains=search) |
                Q(user__username__icontains=search) |
                Q(user__email__icontains=search) |
                Q(business_email__icontains=search)
            )
        
        # Filter by verification status
        verification_status = request.query_params.get('verification_status', None)
        if verification_status:
            sellers = sellers.filter(verification_status=verification_status)
        
        # Filter by is_active
        is_active = request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            sellers = sellers.filter(is_active=is_active_bool)
        
        serializer = SellerProfileSerializer(sellers, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminSellerDetailView(APIView):
    """
    Admin endpoint to manage individual sellers.
    GET: Get seller details
    PATCH: Update seller (verification status, is_active, etc.)
    DELETE: Delete seller profile
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, seller_id):
        # Check if user is admin/staff
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'error': 'You do not have permission to access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            seller = SellerProfile.objects.select_related('user').get(id=seller_id)
            serializer = SellerProfileSerializer(seller)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'Seller not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, seller_id):
        # Check if user is admin/staff
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'error': 'You do not have permission to access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            seller = SellerProfile.objects.get(id=seller_id)
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'Seller not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Allow admin to update verification status, is_active, is_accepting_orders, and verification_notes
        allowed_fields = ['verification_status', 'is_active', 'is_accepting_orders', 'verification_notes']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        # Update verification_date and is_verified if status changed to verified
        if 'verification_status' in update_data and update_data['verification_status'] == 'verified':
            update_data['is_verified'] = True
            update_data['verification_date'] = timezone.now()
        elif 'verification_status' in update_data and update_data['verification_status'] != 'verified':
            update_data['is_verified'] = False
        
        # Directly update the seller object for admin-only fields
        for field, value in update_data.items():
            if hasattr(seller, field):
                setattr(seller, field, value)
        
        seller.save()
        
        # Use serializer for validation if needed, but we've already updated
        serializer = SellerProfileSerializer(seller)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Seller updated successfully',
                'seller_profile': SellerProfileSerializer(seller).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, seller_id):
        # Check if user is admin/staff
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'error': 'You do not have permission to access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            seller = SellerProfile.objects.get(id=seller_id)
            seller.delete()
            return Response({
                'message': 'Seller deleted successfully'
            }, status=status.HTTP_200_OK)
        except SellerProfile.DoesNotExist:
            return Response({
                'error': 'Seller not found'
            }, status=status.HTTP_404_NOT_FOUND)