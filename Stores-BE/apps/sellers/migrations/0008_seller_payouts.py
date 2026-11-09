import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sellers', '0007_selling_categories'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SellerPayout',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(max_length=3)),
                ('method', models.CharField(choices=[('bank_transfer', 'Bank transfer'), ('mobile_money', 'Mobile money'), ('cash', 'Cash'), ('other', 'Other')], max_length=16)),
                ('reference', models.CharField(blank=True, default='', max_length=100)),
                ('note', models.CharField(blank=True, default='', max_length=500)),
                ('paid_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('idempotency_key', models.CharField(blank=True, max_length=64, null=True)),
                ('recorded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recorded_seller_payouts', to=settings.AUTH_USER_MODEL)),
                ('seller', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payouts', to='sellers.sellerprofile')),
            ],
            options={
                'db_table': 'seller_payouts',
                'ordering': ['-paid_at', '-id'],
                'managed': True,
            },
        ),
        migrations.AddConstraint(
            model_name='sellerpayout',
            constraint=models.UniqueConstraint(condition=models.Q(('idempotency_key__isnull', False)), fields=('recorded_by', 'idempotency_key'), name='uniq_seller_payout_per_key'),
        ),
    ]
