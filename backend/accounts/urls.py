from django.urls import path
from .views import LoginView, RegisterView, RefreshView, MeView, LogoutView
urlpatterns = [path("login", LoginView.as_view()), path("register", RegisterView.as_view()),
               path("refresh", RefreshView.as_view()), path("me", MeView.as_view()), path("logout", LogoutView.as_view())]
