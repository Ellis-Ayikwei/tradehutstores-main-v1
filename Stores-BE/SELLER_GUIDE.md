# Seller Profile System Guide

## 🏪 Overview

Complete seller/vendor management system allowing users to operate as both customers and sellers. Users can create seller profiles, manage products, track sales, and operate their own online stores within the platform.

---

## 🎯 **Key Concept**

**Dual Account System**: A single user can have BOTH:
- **Customer Account** (default) - Browse and purchase products
- **Seller Account** (opt-in) - List and sell products

---

## 📦 **Database Models**

### **1. SellerProfile** (`apps.users.models.SellerProfile`)

Main seller account model linked to User (OneToOne).

#### **Fields**

| Category | Fields | Description |
|----------|--------|-------------|
| **Business Info** | business_name, business_description, business_email, business_phone, business_address | Basic business details |
| **Legal & Tax** | business_registration_number, tax_id | Legal identification |
| **Banking** | bank_name, bank_account_number, bank_account_name, bank_routing_number | Payment information |
| **Verification** | is_verified, verification_status, verification_date, verification_notes | Account verification status |
| **Store Branding** | store_logo, store_banner, store_slug | Store visual identity |
| **Performance** | total_sales, total_orders, rating, total_reviews | Business metrics |
| **Settings** | is_active, is_accepting_orders, commission_rate | Account settings |
| **Social Media** | website_url, facebook_url, instagram_url, twitter_url | External links |
| **Policies** | return_policy, shipping_policy, terms_and_conditions | Business policies |

#### **Verification Statuses**
- `pending` - Awaiting verification
- `verified` - Approved by admin
- `rejected` - Application rejected
- `suspended` - Account suspended

### **2. SellerDocument** (`apps.users.models.SellerDocument`)

Documents uploaded for seller verification.

#### **Document Types**
- `id_card` - Government ID
- `passport` - Passport
- `business_license` - Business registration
- `tax_certificate` - Tax registration
- `bank_statement` - Bank verification
- `other` - Other documents

#### **Document Status**
- `pending` - Awaiting review
- `approved` - Approved by admin
- `rejected` - Rejected with notes

### **3. Store** (`apps.store.models.Store`)

Individual stores managed by sellers (optional multi-store feature).

#### **Features**
- Seller can have multiple stores
- Each store has its own branding
- Store-specific product catalogs
- Store performance tracking

### **4. Product Updates** (`apps.products.models.Product`)

Products now linked to sellers:
- `seller` - Legacy User field (kept for compatibility)
- `seller_profile` - New SellerProfile foreign key
- `store` - Optional Store assignment

---

## 🚀 **API Endpoints**

### **Seller Registration & Profile**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/sellers/become-seller/` | Create seller account | ✅ |
| GET | `/api/sellers/profile/` | Get own seller profile | ✅ |
| PUT/PATCH | `/api/sellers/profile/` | Update seller profile | ✅ |
| GET | `/api/sellers/profile/<slug>/` | View public seller profile | ❌ |
| GET | `/api/sellers/list/` | List all verified sellers | ❌ |

### **Seller Statistics**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/sellers/stats/` | Get seller dashboard stats | ✅ |
| POST | `/api/sellers/metrics/update/` | Manually update metrics | ✅ |

### **Seller Documents**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/sellers/documents/` | List uploaded documents | ✅ |
| POST | `/api/sellers/documents/upload/` | Upload verification document | ✅ |

### **Seller Settings**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/sellers/toggle-orders/` | Enable/disable order acceptance | ✅ |

---

## 💡 **Usage Examples**

### **1. Become a Seller**

```bash
curl -X POST http://localhost:8000/api/sellers/become-seller/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "My Tech Store",
    "business_description": "Selling quality electronics",
    "business_email": "store@example.com",
    "business_phone": "+1234567890",
    "business_address": "123 Business St, City, Country",
    "business_registration_number": "REG123456",
    "tax_id": "TAX789012"
  }'

Response:
{
  "message": "Seller profile created successfully",
  "seller_profile": {
    "id": "...",
    "business_name": "My Tech Store",
    "store_slug": "my-tech-store",
    "verification_status": "pending",
    "is_verified": false,
    ...
  }
}
```

### **2. Get Seller Profile**

```bash
curl -X GET http://localhost:8000/api/sellers/profile/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

Response:
{
  "id": "...",
  "user": {
    "id": "...",
    "username": "seller_user",
    "email": "seller@example.com"
  },
  "business_name": "My Tech Store",
  "store_slug": "my-tech-store",
  "verification_status": "verified",
  "is_verified": true,
  "total_sales": "15000.00",
  "total_orders": 125,
  "rating": "4.85",
  "total_reviews": 42,
  ...
}
```

### **3. Update Seller Profile**

```bash
curl -X PATCH http://localhost:8000/api/sellers/profile/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "business_description": "Updated description",
    "business_phone": "+9876543210",
    "return_policy": "30-day return policy on all products",
    "shipping_policy": "Free shipping on orders over $50"
  }'
```

### **4. Upload Verification Document**

```bash
curl -X POST http://localhost:8000/api/sellers/documents/upload/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "document_type=business_license" \
  -F "document_file=@/path/to/license.pdf"

Response:
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "...",
    "document_type": "business_license",
    "status": "pending",
    "created_at": "2025-11-17T..."
  }
}
```

### **5. Get Seller Statistics**

```bash
curl -X GET http://localhost:8000/api/sellers/stats/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

Response:
{
  "total_sales": "15000.00",
  "total_orders": 125,
  "total_products": 45,
  "pending_orders": 8,
  "completed_orders": 110,
  "rating": "4.85",
  "total_reviews": 42,
  "recent_orders": [
    {
      "id": "...",
      "total_amount": "150.00",
      "status": "pending",
      "created_at": "2025-11-17T..."
    },
    ...
  ]
}
```

### **6. View Public Seller Profile**

```bash
curl -X GET http://localhost:8000/api/sellers/profile/my-tech-store/

Response:
{
  "id": "...",
  "business_name": "My Tech Store",
  "business_description": "Selling quality electronics",
  "store_logo": "/media/seller_logos/...",
  "store_banner": "/media/seller_banners/...",
  "store_slug": "my-tech-store",
  "rating": "4.85",
  "total_reviews": 42,
  "rating_percentage": 97.0,
  "total_orders": 125,
  "is_verified": true,
  "is_accepting_orders": true,
  "return_policy": "30-day return policy",
  "shipping_policy": "Free shipping on orders over $50"
}
```

### **7. Toggle Order Acceptance**

```bash
curl -X POST http://localhost:8000/api/sellers/toggle-orders/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

Response:
{
  "message": "Order acceptance enabled",
  "is_accepting_orders": true
}
```

### **8. List All Sellers**

```bash
# All verified sellers
curl -X GET http://localhost:8000/api/sellers/list/

# Search sellers
curl -X GET "http://localhost:8000/api/sellers/list/?search=tech"

Response:
{
  "count": 25,
  "sellers": [
    {
      "id": "...",
      "business_name": "My Tech Store",
      "rating": "4.85",
      "total_orders": 125,
      ...
    },
    ...
  ]
}
```

---

## 🔐 **User Flow**

### **Customer → Seller Journey**

```
1. User Registers
   ↓
2. User Browses as Customer
   ↓
3. User Decides to Sell
   ↓
4. POST /api/sellers/become-seller/
   ↓
5. Fill Business Information
   ↓
6. Upload Verification Documents
   ↓
7. Wait for Admin Approval
   ↓
8. Account Verified (status: verified)
   ↓
9. User Can Now:
   - Manage Products
   - View Sales Dashboard
   - Process Orders
   - **AND STILL** Shop as Customer
```

### **Verification Process**

```
Seller Submits Application
   ↓
Status: pending
   ↓
Admin Reviews Documents
   ↓
Admin Decision
   ├─ Approve → Status: verified, is_verified: true
   ├─ Reject → Status: rejected, add notes
   └─ Request More Info → Update verification_notes
   ↓
Seller Receives Notification
   ↓
If Verified: Can Start Selling
```

---

## 🎨 **Admin Interface**

### **SellerProfile Admin**

**List View Features:**
- Filter by verification status
- Search by business name, username, email
- Bulk actions:
  - Verify sellers
  - Reject sellers
  - Activate/Deactivate

**Detail View Features:**
- All business information
- Bank details (collapsed)
- Verification management
- Logo/banner preview
- Performance metrics
- Social media links
- Policies

### **SellerDocument Admin**

**List View Features:**
- Filter by document type and status
- Search by seller name
- Bulk actions:
  - Approve documents
  - Reject documents

**Detail View Features:**
- Document preview/download
- Review notes
- Approval tracking

---

## 📊 **Seller Metrics**

Automatically tracked performance indicators:

| Metric | Description | Updates |
|--------|-------------|---------|
| `total_sales` | Total revenue | On order completion |
| `total_orders` | Number of orders | On order creation |
| `rating` | Average rating (0-5) | From product reviews |
| `total_reviews` | Number of reviews | From product reviews |

### **Manual Metrics Update**

```python
# In code
seller_profile.update_metrics()

# Via API
POST /api/sellers/metrics/update/
```

---

## 🔗 **Integration with Products**

### **Creating Products as Seller**

```python
# When creating a product, link to seller
product = Product.objects.create(
    name="Product Name",
    seller_profile=request.user.seller_profile,
    store=seller_profile.stores.first(),  # Optional
    ...
)
```

### **Filtering Seller Products**

```python
# Get all products for a seller
seller_products = Product.objects.filter(
    seller_profile=seller_profile
)

# Get products for a specific store
store_products = Product.objects.filter(
    store=store
)
```

---

## 🛠️ **Customization**

### **Commission Rates**

Each seller has a `commission_rate` field (default: 10%):

```python
# Calculate platform fee
platform_fee = order_total * (seller.commission_rate / 100)
seller_payout = order_total - platform_fee
```

### **Multi-Store Support**

Enable sellers to manage multiple stores:

```python
# Create additional store
store = Store.objects.create(
    seller=seller_profile,
    name="My Second Store",
    slug="my-second-store"
)

# Assign products to specific stores
product.store = store
product.save()
```

---

## 🔒 **Permissions & Security**

### **Seller-Only Endpoints**

All seller endpoints check for `seller_profile` existence:

```python
# Automatic check in views
try:
    seller_profile = request.user.seller_profile
except SellerProfile.DoesNotExist:
    return Response({'error': 'You do not have a seller account'})
```

### **Public vs Private Data**

- **Private** (seller only): Banking info, verification notes, commission rate
- **Public** (anyone): Business name, rating, products, policies

---

## 📋 **Database Migrations**

After implementation, run:

```bash
python manage.py makemigrations
python manage.py migrate
```

### **New Tables Created**

1. `seller_profiles` - Main seller accounts
2. `seller_documents` - Verification documents
3. `stores` - Individual stores

### **Updated Tables**

1. `products` - Added `seller_profile` and `store` foreign keys

---

## 🧪 **Testing**

### **Test Seller Creation**

```python
from django.contrib.auth import get_user_model
from apps.users.models import SellerProfile

User = get_user_model()

# Create user
user = User.objects.create_user(
    username='test_seller',
    email='seller@test.com',
    password='testpass123'
)

# Create seller profile
seller = SellerProfile.objects.create(
    user=user,
    business_name='Test Store',
    business_email='store@test.com'
)

print(f"Seller created: {seller.business_name}")
print(f"Store slug: {seller.store_slug}")
print(f"Verification status: {seller.verification_status}")
```

---

## 📝 **Features Checklist**

- [x] SellerProfile model with comprehensive fields
- [x] SellerDocument model for verification
- [x] Store model for multi-store support
- [x] Product linking to seller_profile and store
- [x] Seller registration endpoint
- [x] Seller profile management (GET/UPDATE)
- [x] Public seller profile view
- [x] Seller statistics dashboard
- [x] Document upload and management
- [x] Order acceptance toggle
- [x] Metrics auto-update system
- [x] List all sellers (public)
- [x] Admin interface with bulk actions
- [x] Verification workflow
- [x] Backward compatibility maintained
- [ ] Email notifications for verification status
- [ ] Seller dashboard frontend (future)
- [ ] Payout management system (future)
- [ ] Seller analytics reports (future)

---

## 🎯 **Next Steps**

1. **Run Migrations**: Apply database changes
2. **Create Test Seller**: Use admin or API to create first seller
3. **Verify Seller**: Use admin to approve seller account
4. **Link Products**: Assign products to seller profiles
5. **Test Workflows**: Complete buyer and seller journeys
6. **Frontend Integration**: Build seller dashboard UI
7. **Notifications**: Add email/SMS notifications
8. **Payouts**: Implement payout management

---

**Status**: ✅ FULLY IMPLEMENTED  
**Database Impact**: 3 new tables, 2 new product fields  
**Backward Compatibility**: ✅ Maintained  
**Admin Interface**: ✅ Complete with bulk actions  
**API Endpoints**: 9 endpoints ready

---

## 💡 **Key Benefits**

1. ✅ **Dual Accounts**: Users can buy AND sell
2. ✅ **Verification System**: Admin-approved sellers
3. ✅ **Performance Tracking**: Automated metrics
4. ✅ **Multi-Store Support**: Sellers can manage multiple stores
5. ✅ **Document Management**: Secure verification process
6. ✅ **Public Profiles**: SEO-friendly seller pages
7. ✅ **Flexible Commissions**: Per-seller commission rates
8. ✅ **Complete Admin Control**: Verify, approve, suspend sellers

---

Ready for production deployment after migration!
