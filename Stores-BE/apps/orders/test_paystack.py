import hashlib
import hmac
import json
import uuid
from datetime import timedelta
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.payments import paystack

from . import payment_flow
from .models import CheckoutSession, Order, OrderPayment
from .test_checkout import CheckoutBase
from .tests import client_for

SECRET = "sk_test_secret_key"
WEBHOOK = "/tradehut/api/v1/payments/paystack/webhook/"
VERIFY = "/tradehut/api/v1/payments/paystack/verify/"
SELLER_ORDERS = "/tradehut/api/v1/orders/seller/"
INIT_OK = {"authorization_url": "https://checkout.paystack.com/abc123", "access_code": "ac_1", "reference": "x"}

paystack_on = override_settings(PAYSTACK_SECRET_KEY=SECRET, FRONTEND_URL="http://localhost:3000")


def sign(body: str, secret: str = SECRET) -> str:
    return hmac.new(secret.encode(), body.encode(), hashlib.sha512).hexdigest()


def charge_event(session, *, amount=None, currency="GHS", channel="card", name="charge.success", reference=None):
    minor = int(session.amount * 100) if amount is None else amount
    return {
        "event": name,
        "data": {
            "id": 987654,
            "status": "success",
            "reference": reference or session.reference,
            "amount": minor,
            "currency": currency,
            "channel": channel,
            "gateway_response": "Successful",
            "paid_at": "2026-11-09T10:00:00.000Z",
            # Must never be stored:
            "authorization": {"card_type": "visa", "last4": "4081", "signature": "SECRET-CARD-DATA"},
            "customer": {"email": "buyer@test.dev"},
        },
    }


class OnlineBase(CheckoutBase):
    def place_online(self, *pairs, key="k-online", user=None, init=INIT_OK, **extra):
        side = {"side_effect": init} if isinstance(init, Exception) else {"return_value": init}
        with mock.patch("apps.payments.paystack.initialize", **side) as mocked:
            res = self.place(self.body(*pairs, payment_method="paystack", **extra), key=key, user=user)
        self.init_mock = mocked
        return res

    def session_of(self, res):
        return CheckoutSession.objects.get(pk=uuid.UUID(res.json()["checkout_id"]))

    def webhook(self, event, *, signature="valid", raw=None):
        body = raw if raw is not None else json.dumps(event)
        headers = {}
        if signature == "valid":
            headers["HTTP_X_PAYSTACK_SIGNATURE"] = sign(body)
        elif signature:
            headers["HTTP_X_PAYSTACK_SIGNATURE"] = signature
        return APIClient().post(WEBHOOK, body, content_type="application/json", **headers)


@paystack_on
class PlaceOnlineOrderTests(OnlineBase):
    @override_settings(PAYSTACK_SECRET_KEY="")
    def test_refused_when_paystack_is_not_configured(self):
        v = self.variant(self.seller_a)
        res = self.place_online((v, 1))
        self.assertEqual((res.status_code, res.json()["code"]), (422, "payment_method_unavailable"))
        self.assertEqual(Order.objects.count(), 0)

    def test_creates_pending_orders_reserves_stock_and_opens_the_payment_page(self):
        a = self.variant(self.seller_a, "100.00", qty=5)
        b = self.variant(self.seller_b, "40.00", qty=5)
        res = self.place_online((a, 2), (b, 1))
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        session = self.session_of(res)

        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["amount"], "290.00")
        self.assertEqual(data["payment"], {"provider": "paystack", "authorization_url": INIT_OK["authorization_url"], "reference": session.reference})
        self.assertEqual(session.reference, session.id.hex)
        self.assertGreater(session.expires_at, timezone.now() + timedelta(minutes=25))

        orders = Order.objects.filter(user=self.buyer)
        self.assertEqual(orders.count(), 2)
        for order in orders:
            self.assertEqual((order.order_status, order.payment_status, order.pay_mode), ("Pending", "unpaid", "Online"))
        a.refresh_from_db(); b.refresh_from_db()
        self.assertEqual((a.quantity, b.quantity), (3, 4))

        # Paystack was asked for the right amount (pesewas), reference and return URL.
        kwargs = self.init_mock.call_args.kwargs
        self.assertEqual(kwargs["amount_minor"], 29000)
        self.assertEqual(kwargs["currency"], "GHS")
        self.assertEqual(kwargs["reference"], session.reference)
        self.assertEqual(kwargs["email"], "buyer@test.dev")
        self.assertEqual(kwargs["callback_url"], f"http://localhost:3000/checkout/complete?session={session.id.hex}")

        # One pending ledger row per order.
        rows = OrderPayment.objects.filter(session=session)
        # (2 x 100.00 + 25.00 delivery) and (40.00 + 25.00 delivery); together exactly what Paystack was asked for.
        self.assertEqual(sorted(str(r.amount) for r in rows), ["225.00", "65.00"])
        self.assertTrue(all(r.status == "pending" and r.provider == "paystack" for r in rows))

    def test_replay_returns_the_same_checkout_without_asking_paystack_again(self):
        v = self.variant(self.seller_a, qty=5)
        first = self.place_online((v, 1), key="same")
        second = self.place_online((v, 1), key="same")
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()["checkout_id"], second.json()["checkout_id"])
        self.assertEqual(second.json()["payment"]["authorization_url"], INIT_OK["authorization_url"])
        self.init_mock.assert_not_called()
        self.assertEqual(Order.objects.count(), 1)
        v.refresh_from_db()
        self.assertEqual(v.quantity, 4)

    def test_a_paystack_outage_leaves_a_retryable_checkout(self):
        v = self.variant(self.seller_a, qty=5)
        res = self.place_online((v, 1), init=paystack.PaystackError("boom"))
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIsNone(data["payment"])
        self.assertIn("couldn't open the payment page", data["payment_error"])
        self.assertNotIn("aystack", data["payment_error"])  # the provider is never named to buyers
        checkout_id = data["checkout_id"]

        with mock.patch("apps.payments.paystack.initialize", return_value=INIT_OK) as init:
            retry = client_for(self.buyer).post(f"/tradehut/api/v1/checkout/{checkout_id}/payment/", {}, format="json")
            again = client_for(self.buyer).post(f"/tradehut/api/v1/checkout/{checkout_id}/payment/", {}, format="json")
        self.assertEqual(retry.status_code, 200, retry.content)
        self.assertEqual(retry.json()["payment"]["authorization_url"], INIT_OK["authorization_url"])
        self.assertEqual(again.status_code, 200)
        self.assertEqual(init.call_count, 1, "an already-opened payment page must not be re-initialised")

    def test_retry_endpoint_is_owner_only_and_online_only(self):
        online = self.place_online((self.variant(self.seller_a), 1), key="o1")
        cod = self.place(self.body((self.variant(self.seller_a), 1)), key="c1")
        url = "/tradehut/api/v1/checkout/{}/payment/"
        self.assertEqual(client_for(self.other_buyer).post(url.format(online.json()["checkout_id"]), {}, format="json").status_code, 404)
        res = client_for(self.buyer).post(url.format(cod.json()["checkout_id"]), {}, format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_pending"))

    def test_an_https_url_is_required_from_paystack(self):
        v = self.variant(self.seller_a, qty=5)
        res = self.place_online((v, 1), init={"authorization_url": "http://evil.example/pay"})
        self.assertIsNone(res.json()["payment"])
        self.assertIn("payment_error", res.json())


@paystack_on
class WebhookTests(OnlineBase):
    def setUp(self):
        v1 = self.variant(self.seller_a, "100.00", qty=5)
        v2 = self.variant(self.seller_b, "40.00", qty=5)
        res = self.place_online((v1, 1), (v2, 1))
        self.session = self.session_of(res)
        self.order_ids = [o["id"] for o in res.json()["orders"]]

    def assert_untouched(self):
        self.session.refresh_from_db()
        self.assertEqual(Order.objects.filter(order_status="Pending", payment_status="unpaid").count(), 2)
        self.assertFalse(OrderPayment.objects.filter(status="succeeded").exists())

    def test_missing_or_forged_signature_is_rejected_and_changes_nothing(self):
        event = charge_event(self.session)
        for signature in (None, "deadbeef", sign(json.dumps(event), "sk_test_WRONG")):
            res = self.webhook(event, signature=signature)
            self.assertEqual(res.status_code, 401)
        self.assert_untouched()
        self.assertEqual(self.session.status, "pending")

    def test_signature_must_match_the_exact_body(self):
        event = charge_event(self.session)
        res = self.webhook(event, signature=sign(json.dumps(event) + " "))
        self.assertEqual(res.status_code, 401)
        self.assert_untouched()

    def test_valid_charge_success_marks_everything_paid(self):
        res = self.webhook(charge_event(self.session, channel="mobile_money"))
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "paid")
        self.assertIsNotNone(self.session.paid_at)
        for order in Order.objects.filter(user=self.buyer):
            self.assertEqual((order.order_status, order.payment_status), ("Processing", "paid"))
            self.assertIsNotNone(order.paid_at)
        rows = OrderPayment.objects.filter(session=self.session)
        self.assertEqual(rows.count(), 2)
        self.assertTrue(all(r.status == "succeeded" and r.method == "mobile_money" and r.paid_at for r in rows))
        self.assertEqual(sum(r.amount for r in rows), self.session.amount)
        # Only whitelisted gateway fields are kept: never card or customer data.
        stored = json.dumps(self.session.provider_payload) + json.dumps([r.provider_payload for r in rows])
        self.assertNotIn("SECRET-CARD-DATA", stored)
        self.assertNotIn("authorization", self.session.provider_payload)
        self.assertNotIn("customer", self.session.provider_payload)

    def test_replayed_webhook_is_a_no_op(self):
        self.webhook(charge_event(self.session))
        first_paid_at = CheckoutSession.objects.get(pk=self.session.pk).paid_at
        res = self.webhook(charge_event(self.session))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(OrderPayment.objects.filter(status="succeeded").count(), 2)
        self.assertEqual(OrderPayment.objects.count(), 2)
        self.assertEqual(CheckoutSession.objects.get(pk=self.session.pk).paid_at, first_paid_at)

    def test_wrong_amount_goes_to_review_and_orders_are_not_released(self):
        res = self.webhook(charge_event(self.session, amount=100))
        self.assertEqual(res.status_code, 200)
        self.assert_untouched()
        self.assertEqual(self.session.status, "needs_review")

    def test_wrong_currency_goes_to_review(self):
        self.webhook(charge_event(self.session, currency="USD"))
        self.assert_untouched()
        self.assertEqual(self.session.status, "needs_review")

    def test_unknown_reference_and_other_events_are_acknowledged_and_ignored(self):
        self.assertEqual(self.webhook(charge_event(self.session, reference="nope")).status_code, 200)
        self.assertEqual(self.webhook(charge_event(self.session, name="transfer.success")).status_code, 200)
        self.assertEqual(self.webhook({}, raw="not json").status_code, 200)
        self.assert_untouched()
        self.assertEqual(self.session.status, "pending")

    def test_a_paid_order_can_then_be_shipped_by_its_seller(self):
        self.webhook(charge_event(self.session))
        seller_order = client_for(self.user_a).get(SELLER_ORDERS).json()["results"][0]
        res = client_for(self.user_a).post(
            f"{SELLER_ORDERS}{seller_order['id']}/ship/", {"carrier": "DHL", "tracking_number": "T-9"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)

    def test_payment_after_the_session_expired_is_never_silently_accepted(self):
        CheckoutSession.objects.filter(pk=self.session.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "abandoned"}):
            payment_flow.expire_stale_sessions()
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "expired")
        self.webhook(charge_event(self.session))
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "needs_review")
        self.assertFalse(OrderPayment.objects.filter(status="succeeded").exists())
        self.assertEqual(Order.objects.filter(order_status="Cancelled").count(), 2)


@paystack_on
class VerifyTests(OnlineBase):
    def setUp(self):
        self.v = self.variant(self.seller_a, "100.00", qty=5)
        res = self.place_online((self.v, 1))
        self.session = self.session_of(res)

    def ask(self, ident=None, user=None):
        return client_for(user or self.buyer).get(VERIFY, {"reference": ident or self.session.reference})

    def test_confirms_with_paystack_and_settles_a_paid_session(self):
        data = charge_event(self.session)["data"]
        with mock.patch("apps.payments.paystack.verify", return_value=data) as verify:
            res = self.ask()
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["status"], "paid")
        self.assertEqual(body["orders"][0]["payment_status"], "paid")
        verify.assert_called_once_with(self.session.reference)

    def test_works_with_the_checkout_id_too(self):
        data = charge_event(self.session)["data"]
        with mock.patch("apps.payments.paystack.verify", return_value=data):
            self.assertEqual(self.ask(self.session.id.hex).json()["status"], "paid")

    def test_still_pending_when_paystack_has_no_success_yet(self):
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "abandoned"}):
            self.assertEqual(self.ask().json()["status"], "pending")

    def test_a_failed_attempt_is_reported_without_closing_the_checkout(self):
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "failed"}):
            self.assertEqual(self.ask().json()["status"], "failed")
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "pending")  # a later success can still settle it

    def test_paystack_being_unreachable_does_not_break_polling(self):
        with mock.patch("apps.payments.paystack.verify", side_effect=paystack.PaystackError("down")):
            res = self.ask()
        self.assertEqual((res.status_code, res.json()["status"]), (200, "pending"))

    def test_polling_is_throttled_to_protect_paystack(self):
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "abandoned"}) as verify:
            self.ask(); self.ask(); self.ask()
        self.assertEqual(verify.call_count, 1)

    def test_other_buyers_cannot_poll_my_checkout(self):
        res = self.ask(user=self.other_buyer)
        self.assertEqual((res.status_code, res.json()["code"]), (404, "checkout_not_found"))
        self.assertEqual(client_for().get(VERIFY, {"reference": self.session.reference}).status_code, 401)

    def test_cod_checkout_reports_cod(self):
        cod = self.place(self.body((self.variant(self.seller_a), 1)), key="cod-1")
        res = self.ask(cod.json()["checkout_id"])
        self.assertEqual(res.json()["status"], "cod")


@paystack_on
class ExpiryTests(OnlineBase):
    def setUp(self):
        self.v = self.variant(self.seller_a, "100.00", qty=5)
        self.res = self.place_online((self.v, 2))
        self.session = self.session_of(self.res)

    def expire_now(self):
        CheckoutSession.objects.filter(pk=self.session.pk).update(expires_at=timezone.now() - timedelta(minutes=1))

    def test_unpaid_session_is_cancelled_and_stock_released(self):
        self.v.refresh_from_db()
        self.assertEqual(self.v.quantity, 3)
        self.expire_now()
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "abandoned"}):
            counts = payment_flow.expire_stale_sessions()
        self.assertEqual(counts["expired"], 1)
        self.session.refresh_from_db(); self.v.refresh_from_db()
        self.assertEqual(self.session.status, "expired")
        self.assertEqual(self.v.quantity, 5)
        self.assertEqual(Order.objects.get().order_status, "Cancelled")
        self.assertEqual(OrderPayment.objects.get().status, "failed")

    def test_a_missed_webhook_is_caught_before_cancelling(self):
        self.expire_now()
        with mock.patch("apps.payments.paystack.verify", return_value=charge_event(self.session)["data"]):
            counts = payment_flow.expire_stale_sessions()
        self.assertEqual(counts["paid"], 1)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "paid")
        self.assertEqual(Order.objects.get().payment_status, "paid")

    def test_nothing_is_cancelled_when_paystack_cannot_be_asked(self):
        self.expire_now()
        with mock.patch("apps.payments.paystack.verify", side_effect=paystack.PaystackError("down")):
            counts = payment_flow.expire_stale_sessions()
        self.assertEqual(counts["skipped"], 1)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "pending")
        self.assertEqual(Order.objects.get().order_status, "Pending")

    def test_sessions_inside_their_window_and_paid_ones_are_left_alone(self):
        with mock.patch("apps.payments.paystack.verify") as verify:
            counts = payment_flow.expire_stale_sessions()
        self.assertEqual(sum(counts.values()), 0)
        verify.assert_not_called()

    def test_management_command(self):
        self.expire_now()
        out = StringIO()
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "abandoned"}):
            call_command("expire_checkout_sessions", stdout=out)
        self.assertIn("expired=1", out.getvalue())
