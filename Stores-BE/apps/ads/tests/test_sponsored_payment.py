"""Payment settlement (webhook, verify, sweep) and refunds for sponsored promotions."""

import json
from datetime import timedelta
from unittest import mock

from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ads import sponsored_services as services
from apps.ads.sponsored_models import SponsoredPromotion
from apps.ads.tasks import abandon_stale_sponsored
from apps.notifications.models import Notification
from apps.payments import paystack

from .test_sponsored_base import (
    BASE,
    WEBHOOK,
    SponsoredBase,
    charge_event,
    client_for,
    make_product,
    post_webhook,
    sign,
)

REFUND_QUEUED = {"id": 9001, "status": "pending", "amount": 5000, "currency": "GHS", "customer": {"email": "x@y.invalid"}}


class WebhookTests(SponsoredBase):
    def test_charge_success_settles_once_even_when_delivered_twice(self):
        promotion = self.promotion_from(self.buy())
        first = self.pay(promotion)
        paid_at = first.paid_at
        self.assertEqual(first.status, "pending_review")
        self.assertIsNotNone(paid_at)
        second = self.pay(promotion)
        self.assertEqual((second.status, second.paid_at), ("pending_review", paid_at))
        self.assertEqual(Notification.objects.filter(user=self.staff, kind="sponsored.pending_review").count(), 1)

    def test_only_safe_gateway_fields_are_kept(self):
        promotion = self.pay(self.promotion_from(self.buy()))
        self.assertEqual(promotion.provider_payload["reference"], promotion.reference)
        self.assertNotIn("authorization", promotion.provider_payload)
        self.assertNotIn("customer", promotion.provider_payload)

    def test_bad_or_missing_signature_is_401_and_changes_nothing(self):
        promotion = self.promotion_from(self.buy())
        event = charge_event(promotion)
        self.assertEqual(post_webhook(event, signature="none").status_code, 401)
        res = APIClient().post(WEBHOOK, json.dumps(event), content_type="application/json", HTTP_X_PAYSTACK_SIGNATURE="bad")
        self.assertEqual(res.status_code, 401)
        promotion.refresh_from_db()
        self.assertEqual((promotion.status, promotion.paid_at), ("awaiting_payment", None))

    def test_wrong_amount_or_currency_flags_a_problem_and_never_approves(self):
        for override in ({"amount": 100}, {"currency": "USD"}, {"amount": 5001}):
            with self.subTest(override=override):
                promotion = self.promotion_from(self.buy(product=make_product(self.seller)))
                with self.captureOnCommitCallbacks(execute=True):
                    res = post_webhook(charge_event(promotion, **override))
                self.assertEqual(res.status_code, 200)
                promotion.refresh_from_db()
                self.assertEqual((promotion.status, promotion.payment_problem, promotion.paid_at), ("awaiting_payment", True, None))
        self.assertEqual(Notification.objects.filter(kind="sponsored.payment_problem").count(), 3)

    def test_mismatch_delivered_twice_notifies_staff_once(self):
        promotion = self.promotion_from(self.buy())
        for _ in range(2):
            with self.captureOnCommitCallbacks(execute=True):
                post_webhook(charge_event(promotion, amount=1))
        self.assertEqual(Notification.objects.filter(kind="sponsored.payment_problem").count(), 1)

    def test_unknown_sponsored_reference_is_acknowledged_and_ignored(self):
        promotion = self.promotion_from(self.buy())
        event = charge_event(promotion)
        event["data"]["reference"] = "spn_" + "0" * 32
        res = post_webhook(event)
        self.assertEqual((res.status_code, res.json()), (200, {"received": True}))
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "awaiting_payment")

    def test_payment_after_the_seller_cancelled_is_refunded_in_full(self):
        promotion = self.promotion_from(self.buy())
        self.assertEqual(client_for(self.seller.user).post(BASE + f"seller/{promotion.pk}/cancel/").status_code, 200)
        with mock.patch("apps.payments.paystack.create_refund", return_value=REFUND_QUEUED) as create_refund:
            promotion = self.pay(promotion)
        self.assertEqual(promotion.status, "cancelled")
        self.assertTrue(promotion.payment_problem)
        self.assertEqual((promotion.refund_status, str(promotion.refunded_amount), promotion.provider_refund_id), ("pending", "50.00", "9001"))
        self.assertEqual(create_refund.call_args.kwargs["amount_minor"], 5000)
        self.assertEqual(create_refund.call_args.kwargs["reference"], promotion.reference)


class VerifyTests(SponsoredBase):
    def verify(self, promotion, *, data=None, error=None):
        target = {"side_effect": error} if error else {"return_value": data}
        with mock.patch("apps.payments.paystack.verify", **target) as verify:
            with self.captureOnCommitCallbacks(execute=True):
                res = client_for(self.seller.user).post(BASE + f"seller/{promotion.pk}/verify/")
        self.verify_mock = verify
        return res

    def test_success_settles_the_promotion(self):
        promotion = self.promotion_from(self.buy())
        res = self.verify(promotion, data=charge_event(promotion)["data"])
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "pending_review")
        self.verify_mock.assert_called_once_with(promotion.reference)

    def test_asks_paystack_at_most_once_every_two_seconds(self):
        promotion = self.promotion_from(self.buy())
        self.verify(promotion, data={"status": "abandoned"})
        self.assertEqual(self.verify_mock.call_count, 1)
        res = self.verify(promotion, data=charge_event(promotion)["data"])
        self.verify_mock.assert_not_called()
        self.assertEqual(res.json()["status"], "awaiting_payment")
        SponsoredPromotion.objects.filter(pk=promotion.pk).update(last_verified_at=timezone.now() - timedelta(seconds=3))
        res = self.verify(promotion, data=charge_event(promotion)["data"])
        self.assertEqual(res.json()["status"], "pending_review")

    def test_gateway_trouble_leaves_the_promotion_alone(self):
        promotion = self.promotion_from(self.buy())
        res = self.verify(promotion, error=paystack.PaystackError("down"))
        self.assertEqual((res.status_code, res.json()["status"]), (200, "awaiting_payment"))

    def test_verify_and_webhook_racing_settle_once(self):
        promotion = self.promotion_from(self.buy())
        data = charge_event(promotion)["data"]
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(services.mark_paid(promotion.reference, data), "pending_review")
            self.assertEqual(services.mark_paid(promotion.reference, data), "pending_review")
        self.verify(promotion, data=data)
        self.assertEqual(Notification.objects.filter(kind="sponsored.pending_review").count(), 1)

    def test_a_wrong_amount_from_verify_is_flagged_not_approved(self):
        promotion = self.promotion_from(self.buy())
        self.verify(promotion, data=charge_event(promotion, amount=10)["data"])
        promotion.refresh_from_db()
        self.assertEqual((promotion.status, promotion.payment_problem), ("awaiting_payment", True))


class AbandonSweepTests(SponsoredBase):
    def stale(self, **extra):
        promotion = self.promotion_from(self.buy(product=make_product(self.seller)))
        SponsoredPromotion.objects.filter(pk=promotion.pk).update(created_on=timezone.now() - timedelta(minutes=31), **extra)
        return promotion

    def test_old_unpaid_rows_are_abandoned_and_fresh_ones_kept(self):
        old = self.stale()
        fresh = self.promotion_from(self.buy(product=make_product(self.seller)))
        with mock.patch("apps.payments.paystack.verify", side_effect=paystack.PaystackError("n", status_code=404)):
            counts = services.abandon_stale()
        self.assertEqual(counts["abandoned"], 1)
        old.refresh_from_db()
        fresh.refresh_from_db()
        self.assertEqual((old.status, fresh.status), ("abandoned", "awaiting_payment"))

    def test_running_it_twice_is_a_no_op(self):
        self.stale(authorization_url="")
        self.assertEqual(services.abandon_stale()["abandoned"], 1)
        self.assertEqual(services.abandon_stale()["abandoned"], 0)

    def test_a_missed_webhook_is_settled_instead_of_abandoned(self):
        promotion = self.stale()
        with mock.patch("apps.payments.paystack.verify", return_value=charge_event(promotion)["data"]):
            with self.captureOnCommitCallbacks(execute=True):
                counts = services.abandon_stale()
        promotion.refresh_from_db()
        self.assertEqual((counts["paid"], promotion.status), (1, "pending_review"))

    def test_a_payment_still_in_flight_or_an_unreachable_gateway_is_left_alone(self):
        promotion = self.stale()
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "ongoing"}):
            self.assertEqual(services.abandon_stale()["skipped"], 1)
        with mock.patch("apps.payments.paystack.verify", side_effect=paystack.PaystackError("down", status_code=502)):
            self.assertEqual(services.abandon_stale()["skipped"], 1)
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "awaiting_payment")

    def test_rows_flagged_for_staff_are_never_abandoned(self):
        promotion = self.stale(payment_problem=True)
        self.assertEqual(services.abandon_stale()["abandoned"], 0)
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "awaiting_payment")

    def test_the_beat_task_is_registered_and_runs(self):
        self.assertEqual(
            settings.CELERY_BEAT_SCHEDULE["ads-abandon-stale-sponsored"]["task"], "apps.ads.tasks.abandon_stale_sponsored"
        )
        self.assertEqual(settings.CELERY_BEAT_SCHEDULE["ads-abandon-stale-sponsored"]["schedule"], 1800.0)
        self.assertEqual(abandon_stale_sponsored(), {"abandoned": 0, "paid": 0, "skipped": 0, "errors": 0})


class RefundEventTests(SponsoredBase):
    def rejected(self):
        promotion = self.paid_promotion()
        with mock.patch("apps.payments.paystack.create_refund", return_value=REFUND_QUEUED):
            res = self.staff_post(promotion, "reject", {"reason": "Not suitable"})
        self.assertEqual(res.status_code, 200, res.content)
        promotion.refresh_from_db()
        return promotion

    def refund_event(self, name, **data):
        body = {"event": name, "data": {"id": 9001, "status": "processed", "amount": 5000, "currency": "GHS", **data}}
        with self.captureOnCommitCallbacks(execute=True):
            return post_webhook(body)

    def test_processed_event_marks_the_refund_succeeded_and_tells_the_seller(self):
        promotion = self.rejected()
        self.assertEqual(self.refund_event("refund.processed").status_code, 200)
        promotion.refresh_from_db()
        self.assertEqual(promotion.refund_status, "succeeded")
        self.assertEqual(Notification.objects.filter(user=self.seller.user, kind="sponsored.refund_succeeded").count(), 1)
        self.refund_event("refund.processed")
        self.assertEqual(Notification.objects.filter(user=self.seller.user, kind="sponsored.refund_succeeded").count(), 1)

    def test_failed_event_marks_failed_and_staff_can_retry_once(self):
        promotion = self.rejected()
        self.refund_event("refund.failed", status="failed")
        promotion.refresh_from_db()
        self.assertEqual(promotion.refund_status, "failed")
        self.assertEqual(Notification.objects.filter(user=self.staff, kind="sponsored.refund_failed").count(), 1)
        with mock.patch("apps.payments.paystack.create_refund", return_value={**REFUND_QUEUED, "id": 9002}) as create_refund:
            res = self.staff_post(promotion, "retry-refund")
            again = self.staff_post(promotion, "retry-refund")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(create_refund.call_count, 1)
        self.assertEqual((again.status_code, again.json()["code"]), (409, "not_retryable"))
        promotion.refresh_from_db()
        self.assertEqual((promotion.refund_status, promotion.provider_refund_id, str(promotion.refunded_amount)), ("pending", "9002", "50.00"))

    def test_event_is_matched_by_transaction_reference_when_the_id_is_unknown(self):
        promotion = self.rejected()
        res = self.refund_event("refund.processed", id=777, transaction={"reference": promotion.reference})
        self.assertEqual(res.status_code, 200)
        promotion.refresh_from_db()
        self.assertEqual(promotion.refund_status, "succeeded")

    def test_unmatched_event_is_acknowledged(self):
        self.rejected()
        self.assertEqual(self.refund_event("refund.processed", id=424242).status_code, 200)

    def test_gateway_refusal_marks_the_refund_failed_but_keeps_the_rejection(self):
        promotion = self.paid_promotion()
        with mock.patch("apps.payments.paystack.create_refund", side_effect=paystack.PaystackError("no", refused=True, status_code=400)):
            res = self.staff_post(promotion, "reject", {"reason": "Not suitable"})
        self.assertEqual(res.status_code, 200)
        promotion.refresh_from_db()
        self.assertEqual((promotion.status, promotion.refund_status), ("rejected", "failed"))

    def test_gateway_timeout_leaves_the_refund_pending_and_never_resends_it(self):
        promotion = self.paid_promotion()
        with mock.patch("apps.payments.paystack.create_refund", side_effect=paystack.PaystackError("timeout")) as create_refund:
            self.staff_post(promotion, "reject", {"reason": "Not suitable"})
        promotion.refresh_from_db()
        self.assertEqual((promotion.refund_status, promotion.provider_refund_id), ("pending", ""))
        self.assertEqual(create_refund.call_count, 1)
        with mock.patch("apps.payments.paystack.create_refund", return_value=REFUND_QUEUED) as create_refund:
            res = self.staff_post(promotion, "retry-refund")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_retryable"))
        create_refund.assert_not_called()

    def test_an_order_refund_event_still_reaches_the_order_flow(self):
        res = post_webhook({"event": "refund.processed", "data": {"id": 1, "status": "processed"}})
        self.assertEqual(res.status_code, 200)

    def test_a_signature_is_still_required_for_refund_events(self):
        body = json.dumps({"event": "refund.processed", "data": {"id": 9001}})
        self.assertEqual(APIClient().post(WEBHOOK, body, content_type="application/json").status_code, 401)
        self.assertEqual(len(sign(body)), 128)
