#!/usr/bin/env python
"""Test script to verify management commands work correctly."""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.management import call_command
from apps.catalog.models import Category, Brand

def test_populate_brands():
    """Test the populate_brands command."""
    print("=" * 60)
    print("Testing populate_brands command...")
    print("=" * 60)
    
    initial_categories = Category.objects.count()
    initial_brands = Brand.objects.count()
    
    print(f"\nBefore: Categories={initial_categories}, Brands={initial_brands}")
    
    try:
        call_command('populate_brands', verbosity=2)
        print("\n✓ Command executed successfully!")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    final_categories = Category.objects.count()
    final_brands = Brand.objects.count()
    
    print(f"\nAfter: Categories={final_categories}, Brands={final_brands}")
    print(f"Added: Categories={final_categories - initial_categories}, Brands={final_brands - initial_brands}")
    
    return True

def show_summary():
    """Show current database state."""
    print("\n" + "=" * 60)
    print("Current Database State:")
    print("=" * 60)
    
    categories = Category.objects.all()
    print(f"\nTotal Categories: {categories.count()}")
    for cat in categories[:10]:  # Show first 10
        brand_count = Brand.objects.filter(category=cat).count()
        print(f"  - {cat.name} ({brand_count} brands)")
    
    if categories.count() > 10:
        print(f"  ... and {categories.count() - 10} more categories")
    
    print(f"\nTotal Brands: {Brand.objects.count()}")

if __name__ == '__main__':
    success = test_populate_brands()
    show_summary()
    
    if success:
        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("✗ Tests failed!")
        print("=" * 60)
        sys.exit(1)


