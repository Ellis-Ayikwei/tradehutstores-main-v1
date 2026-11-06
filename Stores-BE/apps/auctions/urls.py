from django.urls import path

from . import views

app_name = "auctions"

urlpatterns = [
    # Buyer / public
    path("", views.AuctionListView.as_view(), name="list"),
    path("me/bidding/", views.MyBiddingView.as_view(), name="my-bidding"),
    path("me/watching/", views.MyWatchingView.as_view(), name="my-watching"),
    # Seller
    path("seller/", views.SellerAuctionListCreateView.as_view(), name="seller-list"),
    path("seller/<uuid:pk>/", views.SellerAuctionDetailView.as_view(), name="seller-detail"),
    path("seller/<uuid:pk>/cancel/", views.SellerAuctionCancelView.as_view(), name="seller-cancel"),
    # Per-auction
    path("<uuid:pk>/", views.AuctionDetailView.as_view(), name="detail"),
    path("<uuid:pk>/state/", views.AuctionStateView.as_view(), name="state"),
    path("<uuid:pk>/bids/", views.AuctionBidsView.as_view(), name="bids"),
    path("<uuid:pk>/buy-now/", views.AuctionBuyNowView.as_view(), name="buy-now"),
    path("<uuid:pk>/watch/", views.AuctionWatchView.as_view(), name="watch"),
]
