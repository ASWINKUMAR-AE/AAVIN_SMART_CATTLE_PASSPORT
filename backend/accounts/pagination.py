from rest_framework import serializers


def page_data(request, query, serializer):
    page = serializers.IntegerField(min_value=1).run_validation(request.query_params.get('page', 1))
    size = serializers.IntegerField(min_value=1, max_value=100).run_validation(request.query_params.get('pageSize', 50))
    count = query.count()
    return {'results': serializer(query[(page - 1) * size:page * size], many=True).data,
            'count': count, 'page': page, 'pageSize': size, 'hasNext': page * size < count}


