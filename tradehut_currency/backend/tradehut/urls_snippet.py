"""
Add to your root urls.py:
"""
from django.urls import path, include

urlpatterns = [
    # ... existing patterns ...
    path('api/', include('fx.urls')),
]
