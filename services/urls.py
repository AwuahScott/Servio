from django.urls import path
from . import views

urlpatterns = [
    path('',                 views.home,            name='home'),
    path('api/join/',        views.submit_join,     name='join'),
    path('api/providers/',   views.get_providers,   name='providers'),
    path('login/',           views.provider_login,  name='login'),
    path('dashboard/',       views.dashboard,       name='dashboard'),
    path('logout/',          views.provider_logout, name='logout'),
]