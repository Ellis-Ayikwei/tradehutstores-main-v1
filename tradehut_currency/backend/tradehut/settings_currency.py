"""
settings_currency.py

Add these to your main settings.py.
This file is for documentation — don't import it separately.
"""

# Add 'fx' to INSTALLED_APPS
INSTALLED_APPS = [
    # ... your existing apps ...
    'fx',
]

# Cache backend — required for rate caching.
# Redis is strongly preferred over LocMemCache in production.
CACHES = {
    'default': {
        'BACKEND':  'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/1'),
    }
}

# Optional: override the FX provider URL
# FX_PROVIDER_URL = 'https://api.frankfurter.app/latest'

# Optional: override base currency (must match your DB price currency)
# FX_BASE_CURRENCY = 'GHS'
