"""Staff review (P7 to P14), seller cancel (P6) and the state machine's legal and illegal edges."""

from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.utils import timezone

from apps.ads import sponsored_services as services
from apps.ads.sponsored_models import SponsoredPackage, SponsoredPromotion
from apps.auctions.errors import ApiError
from apps.auctions.tests.helpers import make_user
from apps.notifications.models import Notification

from .test_sponsored_base import BASE, SponsoredBase, client_for, make_package, make_product

REFUND_QUEUED = {"id": 9001, "status": "pending", "amount": 2500, "currency": "GHS"}


def code_of(exc):
    return exc.exception.detail["code"]


class ApproveTests(SponsoredBase):
    def test_approve_fixes_the_window_and_tells_the_seller(self):
        promotion = self.paid_promotion()
        before = timezone.now()
        res = self.staff_post(promotion, "approve", {"note": "Looks good"})
        self.assertEqual(res.status_code, 200, res.content)
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "approved")
        self.assertGreaterEqual(promotion.starts_at, before)
        self.assertEqual(promotion.ends_at - promotion.starts_at, timedelta(days=7))
        self.assertEqual((promotion.reviewed_by, promotion.review_note), (self.staff, "Looks good"))
        self.assertEqual(res.json()["display_status"], "live")
        self.assertEqual(Notification.objects.filter(user=self.seller.user, kind="sponsored.approved").count(), 1)

    def test_a_later_chosen_start_day_is_honoured(self):
        start = (timezone.now() + timedelta(days=5)).date()
        promotion = self.paid_promotion(starts_on=start.isoformat())
        res = self.staff_post(promotion, "approve")
        self.assertEqual(res.json()["display_status"], "scheduled")
        promotion.refresh_from_db()
        self.assertEqual((promotion.starts_at.date(), promotion.starts_at.hour), (start, 0))

    def test_only_pending_review_can_be_approved(self):
        unpaid = self.promotion_from(self.buy())
        res = self.staff_post(unpaid, "approve")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_pending_review"))
        approved = self.approved_promotion(product=make_product(self.seller))
        res = self.staff_post(approved, "approve")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_pending_review"))

    def test_approve_rechecks_overlap(self):
        first = self.approved_promotion()
        clash = self.paid_promotion(product=make_product(self.seller))
        SponsoredPromotion.objects.filter(pk=clash.pk).update(product=first.product)
        res = self.staff_post(clash, "approve")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "already_promoted"))
        clash.refresh_from_db()
        self.assertEqual(clash.status, "pending_review")

    def test_approve_rechecks_capacity(self):
        capped = make_package(max_concurrent=1, surfaces=("home",))
        self.approved_promotion(package=capped)
        other = self.paid_promotion(product=make_product(self.seller))
        SponsoredPromotion.objects.filter(pk=other.pk).update(package=capped, surfaces=["home"])
        res = self.staff_post(other, "approve")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "sold_out"))

    def test_a_seller_or_buyer_cannot_review(self):
        promotion = self.paid_promotion()
        for user in (self.seller.user, make_user("buyer")):
            res = client_for(user).post(BASE + f"staff/{promotion.pk}/approve/", {}, format="json")
            self.assertEqual(res.status_code, 403)
        self.assertEqual(client_for().post(BASE + f"staff/{promotion.pk}/approve/", {}, format="json").status_code, 401)
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "pending_review")


class RejectTests(SponsoredBase):
    def test_reject_refunds_in_full_and_records_the_reason(self):
        promotion = self.paid_promotion()
        with mock.patch("apps.payments.paystack.create_refund", return_value=REFUND_QUEUED) as create_refund:
            res = self.staff_post(promotion, "reject", {"reason": "Image is not allowed"})
        self.assertEqual(res.status_code, 200, res.content)
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "rejected")
        self.assertEqual((str(promotion.refunded_amount), promotion.refund_status), ("50.00", "pending"))
        self.assertEqual(promotion.review_note, "Image is not allowed")
        kwargs = create_refund.call_args.kwargs
        self.assertEqual((kwargs["reference"], kwargs["amount_minor"], kwargs["currency"]), (promotion.reference, 5000, "GHS"))
        self.assertEqual(Notification.objects.filter(user=self.seller.user, kind="sponsored.rejected").count(), 1)

    def test_reason_is_required(self):
        promotion = self.paid_promotion()
        for body in ({}, {"reason": "   "}):
            self.assertEqual(self.staff_post(promotion, "reject", body).status_code, 400)
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "pending_review")

    def test_only_pending_review_can_be_rejected_and_never_twice(self):
        promotion = self.paid_promotion()
        with mock.patch("apps.payments.paystack.create_refund", return_value=REFUND_QUEUED) as create_refund:
            self.staff_post(promotion, "reject", {"reason": "No"})
            again = self.staff_post(promotion, "reject", {"reason": "No"})
        self.assertEqual((again.status_code, again.json()["code"]), (409, "not_pending_review"))
        self.assertEqual(create_refund.call_count, 1)
        approved = self.approved_promotion(product=make_product(self.seller))
        self.assertEqual(self.staff_post(approved, "reject", {"reason": "No"}).status_code, 409)


class StopTests(SponsoredBase):
    def approved_at(self, start, **kwargs):
        promotion = self.paid_promotion(**kwargs)
        with self.captureOnCommitCallbacks(execute=True):
            services.approve(promotion.pk, staff=self.staff, now=start)
        promotion.refresh_from_db()
        return promotion

    def stop(self, promotion, *, at, refund="prorata", reason=""):
        with mock.patch("apps.payments.paystack.create_refund", return_value=REFUND_QUEUED) as create_refund:
            with self.captureOnCommitCallbacks(execute=True):
                stopped = services.stop(promotion.pk, staff=self.staff, refund=refund, reason=reason, now=at)
        self.create_refund = create_refund
        return stopped

    def test_prorata_refund_mid_run_equals_the_amount_sent_to_paystack(self):
        start = timezone.now() - timedelta(days=3, hours=12)
        promotion = self.approved_at(start)
        stopped = self.stop(promotion, at=start + timedelta(days=3, hours=12))
        self.assertEqual((stopped.status, str(stopped.refunded_amount), stopped.refund_status), ("stopped", "25.00", "pending"))
        self.assertEqual(self.create_refund.call_args.kwargs["amount_minor"], 2500)
        self.assertEqual(Notification.objects.filter(user=self.seller.user, kind="sponsored.stopped").count(), 1)

    def test_prorata_before_the_start_refunds_everything(self):
        start = timezone.now() + timedelta(days=2)
        promotion = self.approved_at(start)
        stopped = self.stop(promotion, at=start - timedelta(hours=1))
        self.assertEqual(str(stopped.refunded_amount), "50.00")

    def test_stop_without_refund_needs_a_reason_and_sends_nothing(self):
        promotion = self.approved_promotion()
        res = self.staff_post(promotion, "stop", {"refund": "none"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("reason", res.json())
        res = self.staff_post(promotion, "stop", {"refund": "none", "reason": "Counterfeit goods"})
        self.assertEqual(res.status_code, 200, res.content)
        promotion.refresh_from_db()
        self.assertEqual((promotion.status, promotion.refund_status, promotion.stop_reason), ("stopped", "none", "Counterfeit goods"))
        self.assertEqual((promotion.stopped_by, str(promotion.refunded_amount)), (self.staff, "0.00"))

    def test_an_invalid_refund_choice_is_400(self):
        promotion = self.approved_promotion()
        self.assertEqual(self.staff_post(promotion, "stop", {"refund": "everything"}).status_code, 400)

    def test_illegal_edges(self):
        pending = self.paid_promotion()
        res = self.staff_post(pending, "stop", {"refund": "none", "reason": "x"})
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_stoppable"))
        unpaid = self.promotion_from(self.buy(product=make_product(self.seller)))
        self.assertEqual(self.staff_post(unpaid, "stop", {"refund": "none", "reason": "x"}).status_code, 409)

        start = timezone.now() - timedelta(days=10)
        ended = self.approved_at(start, product=make_product(self.seller))
        with self.assertRaises(ApiError) as exc:
            services.stop(ended.pk, staff=self.staff, refund="prorata", reason="", now=start + timedelta(days=8))
        self.assertEqual(code_of(exc), "not_stoppable")

        running = self.approved_promotion(product=make_product(self.seller))
        self.assertEqual(self.staff_post(running, "stop", {"refund": "none", "reason": "x"}).status_code, 200)
        again = self.staff_post(running, "stop", {"refund": "none", "reason": "x"})
        self.assertEqual((again.status_code, again.json()["code"]), (409, "not_stoppable"))

    def test_stopping_twice_never_refunds_twice(self):
        start = timezone.now() - timedelta(days=1)
        promotion = self.approved_at(start)
        self.stop(promotion, at=start + timedelta(days=1))
        calls = self.create_refund.call_count
        with self.assertRaises(ApiError):
            services.stop(promotion.pk, staff=self.staff, refund="prorata", reason="", now=start + timedelta(days=2))
        self.assertEqual(calls, 1)

    def test_staff_detail_previews_the_prorata_amount(self):
        promotion = self.approved_promotion()
        detail = client_for(self.staff).get(BASE + f"staff/{promotion.pk}/").json()
        self.assertGreater(Decimal(detail["prorata_refund"]), Decimal("49.00"))
        self.assertLessEqual(Decimal(detail["prorata_refund"]), Decimal("50.00"))
        pending = self.paid_promotion(product=make_product(self.seller))
        self.assertIsNone(client_for(self.staff).get(BASE + f"staff/{pending.pk}/").json()["prorata_refund"])


class CancelTests(SponsoredBase):
    def cancel(self, promotion, user=None):
        with mock.patch("apps.payments.paystack.create_refund", return_value=REFUND_QUEUED) as create_refund:
            res = client_for(user or self.seller.user).post(BASE + f"seller/{promotion.pk}/cancel/")
        self.create_refund = create_refund
        return res

    def test_unpaid_is_cancelled_without_a_refund(self):
        promotion = self.promotion_from(self.buy())
        res = self.cancel(promotion)
        self.assertEqual((res.status_code, res.json()["status"]), (200, "cancelled"))
        self.create_refund.assert_not_called()

    def test_in_review_is_cancelled_with_a_full_refund(self):
        promotion = self.paid_promotion()
        res = self.cancel(promotion)
        self.assertEqual(res.status_code, 200, res.content)
        promotion.refresh_from_db()
        self.assertEqual((promotion.status, str(promotion.refunded_amount), promotion.refund_status), ("cancelled", "50.00", "pending"))
        self.assertEqual(self.create_refund.call_args.kwargs["amount_minor"], 5000)

    def test_approved_and_closed_promotions_cannot_be_cancelled(self):
        approved = self.approved_promotion()
        res = self.cancel(approved)
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_cancellable"))
        done = self.promotion_from(self.buy(product=make_product(self.seller)))
        self.assertEqual(self.cancel(done).status_code, 200)
        self.assertEqual(self.cancel(done).status_code, 409)
        self.create_refund.assert_not_called()

    def test_a_payment_flagged_for_staff_cannot_be_cancelled_by_the_seller(self):
        promotion = self.promotion_from(self.buy())
        SponsoredPromotion.objects.filter(pk=promotion.pk).update(payment_problem=True)
        self.assertEqual(self.cancel(promotion).json()["code"], "not_cancellable")

    def test_cancel_versus_approve_leaves_one_winner(self):
        promotion = self.paid_promotion()
        self.assertEqual(self.cancel(promotion).status_code, 200)
        res = self.staff_post(promotion, "approve")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_pending_review"))


class CompTests(SponsoredBase):
    def comp(self, user=None, **extra):
        body = {"product_id": str(self.product.pk), "package_id": str(self.package.pk), "note": "Launch partner", **extra}
        with self.captureOnCommitCallbacks(execute=True):
            return client_for(user or self.staff).post(BASE + "staff/", body, format="json")

    def test_comp_is_approved_immediately_at_price_zero(self):
        res = self.comp()
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual((body["status"], body["display_status"], body["source"], body["price_paid"]), ("approved", "live", "staff", "0.00"))
        promotion = SponsoredPromotion.objects.get(pk=body["id"])
        self.assertEqual((promotion.seller, promotion.reference, promotion.paid_at), (self.seller, None, None))
        self.assertEqual(promotion.ends_at - promotion.starts_at, timedelta(days=7))
        self.assertEqual(Notification.objects.filter(user=self.seller.user, kind="sponsored.approved").count(), 1)

    def test_comp_respects_overlap_and_capacity(self):
        self.assertEqual(self.comp().status_code, 201)
        res = self.comp()
        self.assertEqual((res.status_code, res.json()["code"]), (409, "already_promoted"))
        capped = make_package(max_concurrent=1, surfaces=("home",))
        self.assertEqual(self.comp(package_id=str(capped.pk)).status_code, 201)
        other = make_product(self.other_seller)
        res = self.comp(package_id=str(capped.pk), product_id=str(other.pk))
        self.assertEqual((res.status_code, res.json()["code"]), (409, "sold_out"))

    def test_stopping_a_comp_never_refunds(self):
        promotion = SponsoredPromotion.objects.get(pk=self.comp().json()["id"])
        with mock.patch("apps.payments.paystack.create_refund") as create_refund:
            res = self.staff_post(promotion, "stop", {"refund": "prorata"})
        self.assertEqual(res.status_code, 200, res.content)
        create_refund.assert_not_called()
        promotion.refresh_from_db()
        self.assertEqual((promotion.status, promotion.refund_status), ("stopped", "none"))

    def test_only_staff_can_comp(self):
        self.assertEqual(self.comp(user=self.seller.user).status_code, 403)
        self.assertEqual(SponsoredPromotion.objects.count(), 0)

    def test_unknown_listing_or_package_is_404(self):
        self.assertEqual(self.comp(product_id=str(make_product(self.seller, status="Draft").pk)).status_code, 404)
        self.package.is_active = False
        self.package.save()
        self.assertEqual(self.comp().status_code, 404)


class StaffListTests(SponsoredBase):
    def test_list_filters_by_status_search_and_seller(self):
        paid = self.paid_promotion()
        rival_product = make_product(self.other_seller, name="Zebra Lamp")
        rival = self.promotion_from(self.buy(user=self.other_seller.user, product=rival_product))
        staff = client_for(self.staff)
        self.assertEqual(staff.get(BASE + "staff/").json()["count"], 2)
        review = staff.get(BASE + "staff/?status=pending_review").json()
        self.assertEqual([r["id"] for r in review["results"]], [str(paid.pk)])
        self.assertEqual(staff.get(BASE + "staff/?q=zebra").json()["results"][0]["id"], str(rival.pk))
        self.assertEqual(staff.get(BASE + f"staff/?seller={self.other_seller.pk}").json()["count"], 1)
        self.assertEqual(staff.get(BASE + "staff/?seller=not-a-uuid").json()["count"], 0)

    def test_detail_carries_payment_and_refund_fields_and_sellers_cannot_see_it(self):
        promotion = self.paid_promotion()
        detail = client_for(self.staff).get(BASE + f"staff/{promotion.pk}/").json()
        for field in ("payment_problem", "provider_payload", "provider_refund_id", "refund_status", "seller", "reference"):
            self.assertIn(field, detail)
        self.assertEqual(detail["seller"]["business_name"], self.seller.business_name)
        self.assertEqual(client_for(self.seller.user).get(BASE + f"staff/{promotion.pk}/").status_code, 403)
        self.assertEqual(client_for(self.seller.user).get(BASE + "staff/").status_code, 403)
        self.assertEqual(client_for(self.staff).get(BASE + "staff/00000000-0000-0000-0000-000000000000/").status_code, 404)


class PackageAdminTests(SponsoredBase):
    def test_create_edit_and_deactivate(self):
        staff = client_for(self.staff)
        body = {"name": "Search boost", "surfaces": ["search", "search", "category"], "duration_days": 7, "price": "50.00"}
        res = staff.post(BASE + "staff/packages/", body, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        package = res.json()
        self.assertEqual((package["surfaces"], package["currency"], package["max_concurrent"], package["is_active"]), (["search", "category"], "GHS", None, True))
        res = staff.patch(BASE + f"staff/packages/{package['id']}/", {"is_active": False, "max_concurrent": 3}, format="json")
        self.assertEqual((res.status_code, res.json()["is_active"], res.json()["max_concurrent"]), (200, False, 3))
        self.assertEqual(staff.delete(BASE + f"staff/packages/{package['id']}/").status_code, 405)
        listed = staff.get(BASE + "staff/packages/").json()
        self.assertIn(package["id"], [p["id"] for p in listed["results"]])

    def test_validation(self):
        staff = client_for(self.staff)
        good = {"name": "X", "surfaces": ["home"], "duration_days": 7, "price": "5.00"}
        for bad in (
            {"surfaces": []},
            {"surfaces": ["sidebar"]},
            {"duration_days": 0},
            {"duration_days": 91},
            {"price": "0.00"},
            {"price": "-1"},
            {"max_concurrent": 0},
            {"name": ""},
        ):
            with self.subTest(bad=bad):
                self.assertEqual(staff.post(BASE + "staff/packages/", {**good, **bad}, format="json").status_code, 400)
        self.assertEqual(SponsoredPackage.objects.count(), 1)  # only the fixture package

    def test_price_edits_do_not_change_existing_promotions(self):
        promotion = self.paid_promotion()
        client_for(self.staff).patch(BASE + f"staff/packages/{self.package.pk}/", {"price": "99.00"}, format="json")
        promotion.refresh_from_db()
        self.assertEqual(promotion.price_paid, Decimal("50.00"))

    def test_sellers_cannot_manage_packages(self):
        seller = client_for(self.seller.user)
        self.assertEqual(seller.get(BASE + "staff/packages/").status_code, 403)
        self.assertEqual(seller.post(BASE + "staff/packages/", {}, format="json").status_code, 403)
        self.assertEqual(seller.patch(BASE + f"staff/packages/{self.package.pk}/", {"price": "1.00"}, format="json").status_code, 403)
