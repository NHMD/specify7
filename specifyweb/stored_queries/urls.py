from django.conf.urls import patterns, include, url

urlpatterns = patterns('specifyweb.stored_queries.views',
    url(r'^query/(?P<id>\d+)/$', 'query'),
    url(r'^query/(?<id>\d+)/record_set/$', 'make_record_set'),
)
