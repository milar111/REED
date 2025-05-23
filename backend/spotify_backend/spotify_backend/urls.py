"""
URL configuration for spotify_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path
from spotify_signup import views
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    path('', views.index, name='index'),
    path('login', views.login, name='login'),
    path('callback', views.callback, name='callback'),
    path('check_auth', views.check_auth, name='check_auth'),
    path('options-check-auth', views.options_check_auth, name='options_check_auth'),
    path('logout', views.logout, name='logout'),
    # path('download/<str:playlist_id>/', views.download_playlist, name='download_playlist'),
    path('api/playlists', views.api_playlists, name='api_playlists'),
    path('download/<str:playlist_id>', csrf_exempt(views.download_playlist), name='download_playlist'),

    path('download/<str:playlist_id>', views.download_playlist, name='download_playlist'),
    path('download-status/<str:playlist_id>', views.check_download_status, name='check_download_status'),
    path('download-archive/<str:playlist_id>', views.get_download_archive, name='get_download_archive'),
    path('download-result/<str:token>', views.get_download_result, name='get_download_result'),
]