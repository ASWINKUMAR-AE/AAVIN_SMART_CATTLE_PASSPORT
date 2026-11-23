from django.apps import AppConfig


class DispatchHistoryConfig(AppConfig):
    name = 'accounts.migration_history.dispatch'
    label = 'dispatch'
    verbose_name = 'Dispatch migration history'
    default_auto_field = 'django.db.models.BigAutoField'
