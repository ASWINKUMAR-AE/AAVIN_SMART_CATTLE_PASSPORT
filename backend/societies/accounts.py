from rest_framework.exceptions import PermissionDenied
from accounts.domain_views import RoleListView, RoleDetailView
from .models import Society


class SocietyScope:
    role = 'society'
    plural = 'societies'

    def queryset(self, actor):
        query = Society.objects.all()
        if actor.role == 'union':
            return query.filter(bmc__union_id=actor.pk)
        if actor.role == 'bmc':
            return query.filter(bmc_id=actor.pk)
        if actor.role == 'society':
            return query.filter(pk=actor.pk)
        raise PermissionDenied('Society accounts are accessible only within their BMC and Union.')

    def can_update(self, actor, row):
        return actor.role in ['bmc', 'union']


class SocietyListView(SocietyScope, RoleListView):
    pass


class SocietyDetailView(SocietyScope, RoleDetailView):
    pass
