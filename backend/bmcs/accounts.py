from rest_framework.exceptions import PermissionDenied
from accounts.domain_views import RoleListView, RoleDetailView
from .models import BMC


class BMCScope:
    role = 'bmc'
    plural = 'bmcs'

    def queryset(self, actor):
        query = BMC.objects.all()
        if actor.role == 'union':
            return query.filter(union_id=actor.pk)
        if actor.role == 'bmc':
            return query.filter(pk=actor.pk)
        raise PermissionDenied('BMC accounts are accessible only within their Union.')

    def can_update(self, actor, row):
        return actor.role == 'union'


class BMCListView(BMCScope, RoleListView):
    pass


class BMCDetailView(BMCScope, RoleDetailView):
    pass
