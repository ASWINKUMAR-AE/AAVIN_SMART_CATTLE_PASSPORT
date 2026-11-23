from rest_framework.exceptions import PermissionDenied
from accounts.domain_views import RoleListView, RoleDetailView
from .models import Union


class UnionScope:
    role = 'union'
    plural = 'unions'

    def queryset(self, actor):
        if actor.role != 'union':
            raise PermissionDenied('Only Union accounts can access Union details.')
        return Union.objects.filter(pk=actor.pk)

    def can_update(self, actor, row):
        return actor.role == 'union' and row.pk == actor.pk


class UnionListView(UnionScope, RoleListView):
    pass


class UnionDetailView(UnionScope, RoleDetailView):
    pass
