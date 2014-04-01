from django.conf.urls import patterns, include, url

urlpatterns = patterns('specifyweb.stored_queries.views',
    url(r'^query/(?P<id>\d+)/$', 'execute_query'),
    url(r'^query/(?P<id>\d+)/make_record_set/$', 'make_record_set'),
)
