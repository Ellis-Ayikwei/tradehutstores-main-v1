"""
Seller Profile URLs
"""

from django.urls import path
from .seller_views import (
    BecomeSellerView,
    SellerProfileView,
    SellerPublicProfileView,
    SellerStatsView,
    SellerDocumentUploadView,
    SellerDocumentListView,
    ToggleAcceptOrdersView,
    UpdateSellerMetricsView,
    ListSellersView,
    AdminListSellersView,
    AdminSellerDetailView,
)

app_name = 'sellers'

urlpatterns = [
    # Seller registration
    path('become-seller/', BecomeSellerView.as_view(), name='become_seller'),
    
    # Seller profile management
    path('profile/', SellerProfileView.as_view(), name='seller_profile'),
    path('profile/<str:identifier>/', SellerPublicProfileView.as_view(), name='seller_public_profile'),
    
    # Seller statistics
    path('stats/', SellerStatsView.as_view(), name='seller_stats'),
    path('metrics/update/', UpdateSellerMetricsView.as_view(), name='update_metrics'),
    
    # Seller documents
    path('documents/', SellerDocumentListView.as_view(), name='seller_documents'),
    path('documents/upload/', SellerDocumentUploadView.as_view(), name='upload_document'),
    
    # Seller settings
    path('toggle-orders/', ToggleAcceptOrdersView.as_view(), name='toggle_orders'),
    
    # Public seller list
    path('list/', ListSellersView.as_view(), name='list_sellers'),
    
    # Admin seller management
    path('admin/list/', AdminListSellersView.as_view(), name='admin_list_sellers'),
    path('admin/<str:seller_id>/', AdminSellerDetailView.as_view(), name='admin_seller_detail'),
]
