from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from . import services
from .models import Notification

User = get_user_model()

LIST = "notification-list"
UNREAD = "unread-count"
READ_ALL = "notification-read-all"
READ = "notification-read"
DETAIL = "notification-detail"


def _user(email):
    return User.objects.create_user(email=email, password="pass12345!")


class NotifyServiceTests(TestCase):
    def setUp(self):
        self.user = _user("a@test.dev")

    def test_notify_creates_row(self):
        services.notify(self.user.pk, "auction.outbid", "Outbid", "Body", "/orders/1", data={"x": 1})
        n = Notification.objects.get()
        self.assertEqual(n.user_id, self.user.pk)
        self.assertEqual(n.kind, "auction.outbid")
        self.assertEqual(n.title, "Outbid")
        self.assertEqual(n.body, "Body")
        self.assertEqual(n.link, "/orders/1")
        self.assertEqual(n.data, {"x": 1})
        self.assertIsNone(n.read_at)

    def test_notify_positional_signature_without_data(self):
        services.notify(self.user.pk, "k", "t", "b", "/x")
        self.assertEqual(Notification.objects.get().data, {})

    def test_link_sanitising(self):
        cases = {
            "javascript:alert(1)": "",
            "//evil.com": "",
            "https://x": "",
            "/\\evil.com": "",
            "relative/path": "",
            "/orders/1": "/orders/1",
        }
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                Notification.objects.all().delete()
                services.notify(self.user.pk, "k", "t", "b", raw)
                self.assertEqual(Notification.objects.get().link, expected)

    def test_title_and_kind_truncated(self):
        services.notify(self.user.pk, "k" * 100, "t" * 500)
        n = Notification.objects.get()
        self.assertEqual(len(n.kind), 60)
        self.assertEqual(len(n.title), 160)

    def test_notify_swallows_errors(self):
        with mock.patch.object(Notification.objects, "create", side_effect=RuntimeError("boom")):
            self.assertIsNone(services.notify(self.user.pk, "k", "t"))
        self.assertEqual(Notification.objects.count(), 0)

    def test_mark_read_does_not_change_created_at(self):
        services.notify(self.user.pk, "k", "t")
        n = Notification.objects.get()
        created = n.created_at
        services.mark_read(self.user, n.pk)
        self.assertEqual(Notification.objects.get().created_at, created)


class NotificationApiTests(TestCase):
    def setUp(self):
        self.a = _user("a@test.dev")
        self.b = _user("b@test.dev")
        self.client_a = APIClient()
        self.client_a.force_authenticate(self.a)

    def _make(self, user, kind="order.shipped", title="T"):
        services.notify(user.pk, kind, title, "body", "/orders/1")
        return Notification.objects.filter(user=user).latest("created_at")

    def test_unauthenticated_is_401(self):
        client = APIClient()
        n = self._make(self.a)
        for method, path in [
            ("get", reverse(LIST)),
            ("get", reverse(UNREAD)),
            ("get", reverse(DETAIL, args=[n.pk])),
            ("post", reverse(READ, args=[n.pk])),
            ("post", reverse(READ_ALL)),
            ("delete", reverse(DETAIL, args=[n.pk])),
        ]:
            with self.subTest(path=path):
                self.assertEqual(getattr(client, method)(path).status_code, 401)

    def test_list_is_scoped_and_paginated(self):
        mine = self._make(self.a)
        self._make(self.b)
        res = self.client_a.get(reverse(LIST))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(str(res.data["results"][0]["id"]), str(mine.pk))
        self.assertEqual(
            set(res.data["results"][0]),
            {"id", "kind", "title", "body", "link", "data", "is_read", "read_at", "created_at"},
        )
        self.assertIn("next", res.data)
        self.assertIn("previous", res.data)

    def test_list_page_size_capped(self):
        for i in range(3):
            self._make(self.a, title=f"t{i}")
        res = self.client_a.get(reverse(LIST), {"page_size": 2})
        self.assertEqual(len(res.data["results"]), 2)
        self.assertIsNotNone(res.data["next"])
        res = self.client_a.get(reverse(LIST), {"page_size": 1000})
        self.assertEqual(res.status_code, 200)

    def test_list_filters_unread_and_kind(self):
        n1 = self._make(self.a, kind="auction.outbid")
        self._make(self.a, kind="order.shipped")
        services.mark_read(self.a, n1.pk)
        unread = self.client_a.get(reverse(LIST), {"unread": "true"})
        self.assertEqual(unread.data["count"], 1)
        self.assertEqual(unread.data["results"][0]["kind"], "order.shipped")
        by_kind = self.client_a.get(reverse(LIST), {"kind": "auction"})
        self.assertEqual(by_kind.data["count"], 1)
        self.assertEqual(by_kind.data["results"][0]["kind"], "auction.outbid")

    def test_unread_count(self):
        self._make(self.a)
        n2 = self._make(self.a)
        self._make(self.b)
        self.assertEqual(self.client_a.get(reverse(UNREAD)).data, {"count": 2})
        services.mark_read(self.a, n2.pk)
        self.assertEqual(self.client_a.get(reverse(UNREAD)).data, {"count": 1})

    def test_detail_of_other_user_is_404(self):
        theirs = self._make(self.b)
        self.assertEqual(self.client_a.get(reverse(DETAIL, args=[theirs.pk])).status_code, 404)
        mine = self._make(self.a)
        res = self.client_a.get(reverse(DETAIL, args=[mine.pk]))
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["is_read"])

    def test_read_is_idempotent(self):
        n = self._make(self.a)
        first = self.client_a.post(reverse(READ, args=[n.pk]))
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.data["is_read"])
        read_at = Notification.objects.get(pk=n.pk).read_at
        self.assertIsNotNone(read_at)
        second = self.client_a.post(reverse(READ, args=[n.pk]))
        self.assertEqual(second.status_code, 200)
        self.assertEqual(Notification.objects.get(pk=n.pk).read_at, read_at)

    def test_read_other_users_is_404_and_untouched(self):
        theirs = self._make(self.b)
        self.assertEqual(self.client_a.post(reverse(READ, args=[theirs.pk])).status_code, 404)
        self.assertIsNone(Notification.objects.get(pk=theirs.pk).read_at)

    def test_read_all_counts_only_unread_and_only_mine(self):
        n1 = self._make(self.a)
        self._make(self.a)
        self._make(self.a)
        theirs = self._make(self.b)
        services.mark_read(self.a, n1.pk)
        res = self.client_a.post(reverse(READ_ALL))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {"updated": 2})
        self.assertEqual(self.client_a.post(reverse(READ_ALL)).data, {"updated": 0})
        self.assertIsNone(Notification.objects.get(pk=theirs.pk).read_at)

    def test_delete_mine_204_other_404(self):
        mine = self._make(self.a)
        theirs = self._make(self.b)
        self.assertEqual(self.client_a.delete(reverse(DETAIL, args=[theirs.pk])).status_code, 404)
        self.assertTrue(Notification.objects.filter(pk=theirs.pk).exists())
        self.assertEqual(self.client_a.delete(reverse(DETAIL, args=[mine.pk])).status_code, 204)
        self.assertFalse(Notification.objects.filter(pk=mine.pk).exists())
