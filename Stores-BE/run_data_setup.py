"""
Quick script to run data population commands.
Run this to populate your database with categories and brands.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.management import call_command
from apps.catalog.models import Category, Brand

def main():
    print("=" * 70)
    print("DATA POPULATION SCRIPT")
    print("=" * 70)
    
    # Show initial state
    initial_cats = Category.objects.count()
    initial_brands = Brand.objects.count()
    print(f"\nInitial state: {initial_cats} categories, {initial_brands} brands")
    
    # Run populate_brands
    print("\n" + "-" * 70)
    print("Running: populate_brands")
    print("-" * 70)
    try:
        call_command('populate_brands')
        print("✓ populate_brands completed successfully!")
    except Exception as e:
        print(f"✗ Error running populate_brands: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Show final state
    final_cats = Category.objects.count()
    final_brands = Brand.objects.count()
    print(f"\nFinal state: {final_cats} categories, {final_brands} brands")
    print(f"Added: {final_cats - initial_cats} categories, {final_brands - initial_brands} brands")
    
    # Show sample data
    print("\n" + "-" * 70)
    print("Sample Categories:")
    print("-" * 70)
    for cat in Category.objects.all()[:5]:
        brand_count = Brand.objects.filter(category=cat).count()
        print(f"  • {cat.name} ({brand_count} brands)")
    
    if Category.objects.count() > 5:
        print(f"  ... and {Category.objects.count() - 5} more categories")
    
    print("\n" + "=" * 70)
    print("✓ Data population complete!")
    print("=" * 70)
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)


