from django.apps import AppConfig


class CollectionsConfig(AppConfig):
    # Avoid shadowing Python's standard-library collections package.
    name = 'milk_collections'
    label = 'collections'
    default_auto_field = 'django.db.models.BigAutoField'
